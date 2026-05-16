// models/OrderModel.js
const pool = require('../config/database');

class OrderModel {
    // Создание таблицы заказов
    static async createTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS orders (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                printer_id BIGINT REFERENCES printers(id) ON DELETE SET NULL,
                material_id BIGINT REFERENCES materials(id) ON DELETE SET NULL,
                name VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),

                -- Параметры калькулятора (входные данные)
                calc_materials JSONB DEFAULT '{}',
                -- {
                --   "modelWeight": number,       -- вес модели (г)
                --   "supportWeight": number,     -- вес поддержек (г)
                --   "filamentPrice": number      -- цена филамента (за кг)
                -- }

                calc_electricity JSONB DEFAULT '{}',
                -- {
                --   "powerConsumption": number,  -- потребляемая мощность (Вт)
                --   "printTime": number,         -- время печати (мин)
                --   "electricityPrice": number   -- цена электроэнергии (за кВт·ч)
                -- }

                calc_depreciation JSONB DEFAULT '{}',
                -- {
                --   "printerCost": number,       -- стоимость принтера
                --   "printResource": number      -- ресурс принтера (часы)
                -- }

                calc_labor JSONB DEFAULT '{}',
                -- {
                --   "hourlyRate": number,        -- ставка за час
                --   "workTime": number           -- время работы (мин)
                -- }

                calc_additional JSONB DEFAULT '{}',
                -- {
                --   "additionalExpensesPercent": number,  -- доп. расходы (%)
                --   "marginPercent": number               -- маржа (%)
                -- }

                -- Результаты расчёта (выходные данные)
                calc_result JSONB DEFAULT '{}',
                -- Структура соответствует CalculationResult:
                -- {
                --   "materials": {
                --     "model":   { "value": number, "formatted": string, "currency": string },
                --     "support": { "value": number, "formatted": string, "currency": string },
                --     "total":   { "value": number, "formatted": string, "currency": string }
                --   },
                --   "electricity":        { "value": number, "formatted": string, "currency": string },
                --   "depreciation":       { "value": number, "formatted": string, "currency": string },
                --   "labor":              { "value": number, "formatted": string, "currency": string },
                --   "primeCost":          { "value": number, "formatted": string, "currency": string },
                --   "additionalExpenses": { "value": number, "formatted": string, "currency": string, "percent": string },
                --   "fullCost":           { "value": number, "formatted": string, "currency": string },
                --   "margin":             { "value": number, "formatted": string, "currency": string, "percent": string },
                --   "finalPrice":         { "value": number, "formatted": string, "currency": string },
                --   "pricePerGram":       { "value": number, "formatted": string, "unit": string },
                --   "totalWeight":        { "grams": number, "kg": number }
                -- }

                -- Денормализованные поля для быстрой фильтрации и агрегации
                -- Заполняются триггером trg_orders_sync_denorm на INSERT/UPDATE
                total_weight_grams DECIMAL(10,2) DEFAULT 0,
                print_time_minutes INTEGER        DEFAULT 0,
                total_cost         DECIMAL(10,2)  DEFAULT 0,
                margin_percent     INTEGER         DEFAULT 0,
                final_price        DECIMAL(10,2)  DEFAULT 0,

                -- Дополнительные данные
                notes TEXT,
                settings JSONB DEFAULT '{}',

                created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_orders_user_id   ON orders(user_id);
            CREATE INDEX IF NOT EXISTS idx_orders_status    ON orders(status);
            CREATE INDEX IF NOT EXISTS idx_orders_created   ON orders(created_at);
            CREATE INDEX IF NOT EXISTS idx_orders_printer   ON orders(printer_id);
            CREATE INDEX IF NOT EXISTS idx_orders_material  ON orders(material_id);

            -- GIN-индексы для поиска по JSONB-параметрам
            CREATE INDEX IF NOT EXISTS idx_orders_calc_result      ON orders USING GIN (calc_result);
            CREATE INDEX IF NOT EXISTS idx_orders_calc_materials   ON orders USING GIN (calc_materials);
            CREATE INDEX IF NOT EXISTS idx_orders_calc_electricity ON orders USING GIN (calc_electricity);

            -- Триггерная функция: синхронизирует денормализованные поля из JSONB
            CREATE OR REPLACE FUNCTION orders_sync_denorm()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.total_weight_grams := COALESCE(
                    ((NEW.calc_result->'totalWeight'->>'grams')::DECIMAL), 0
                );
                NEW.print_time_minutes := COALESCE(
                    ((NEW.calc_electricity->>'printTime')::INTEGER), 0
                );
                NEW.total_cost := COALESCE(
                    ((NEW.calc_result->'fullCost'->>'value')::DECIMAL), 0
                );
                NEW.margin_percent := COALESCE(
                    ((NEW.calc_additional->>'marginPercent')::INTEGER), 0
                );
                NEW.final_price := COALESCE(
                    ((NEW.calc_result->'finalPrice'->>'value')::DECIMAL), 0
                );
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trg_orders_sync_denorm ON orders;
            CREATE TRIGGER trg_orders_sync_denorm
                BEFORE INSERT OR UPDATE ON orders
                FOR EACH ROW EXECUTE FUNCTION orders_sync_denorm();
        `;
        await pool.query(query);
    }

    // ─── Вспомогательный метод: извлекает финансовые поля из calc_result ────────
    // Нужен для обратной совместимости — старый код мог читать плоские поля напрямую.
    static #flattenResult(row) {
        if (!row) return row;
        const r = row.calc_result || {};
        return {
            ...row,
            // Плоские алиасы (read-only, не хранятся в БД отдельно)
            material_cost:       r.materials?.total?.value      ?? 0,
            electricity_cost:    r.electricity?.value           ?? 0,
            depreciation_cost:   r.depreciation?.value          ?? 0,
            labor_cost:          r.labor?.value                 ?? 0,
            additional_expenses: r.additionalExpenses?.value    ?? 0,
            // total_cost, margin_percent, final_price — вычисляемые столбцы в БД
        };
    }

    // ─── Создание заказа ─────────────────────────────────────────────────────────
    static async create(userId, orderData) {
        const {
            printer_id,
            material_id,
            name,
            // Параметры калькулятора
            calc_materials   = {},
            calc_electricity = {},
            calc_depreciation = {},
            calc_labor       = {},
            calc_additional  = {},
            // Результат расчёта
            calc_result      = {},
            // Прочее
            notes,
            settings         = {},
        } = orderData;

        const query = `
            INSERT INTO orders (
                user_id, printer_id, material_id, name, status,
                calc_materials, calc_electricity, calc_depreciation,
                calc_labor, calc_additional, calc_result,
                notes, settings
            ) VALUES (
                $1, $2, $3, $4, 'in_progress',
                $5, $6, $7,
                $8, $9, $10,
                $11, $12
            )
            RETURNING *
        `;
        const values = [
            userId,
            printer_id  || null,
            material_id || null,
            name,
            JSON.stringify(calc_materials),
            JSON.stringify(calc_electricity),
            JSON.stringify(calc_depreciation),
            JSON.stringify(calc_labor),
            JSON.stringify(calc_additional),
            JSON.stringify(calc_result),
            notes || null,
            JSON.stringify(settings),
        ];
        const result = await pool.query(query, values);
        return this.#flattenResult(result.rows[0]);
    }

    // ─── Получение всех заказов пользователя ─────────────────────────────────────
    static async findByUser(userId, status = null, limit = 50, offset = 0) {
        let query = `
            SELECT o.*,
                   p.name as printer_name, p.type as printer_type,
                   m.name as material_name, m.category as material_category, m.type as material_type
            FROM orders o
            LEFT JOIN printers  p ON o.printer_id  = p.id
            LEFT JOIN materials m ON o.material_id = m.id
            WHERE o.user_id = $1
        `;
        const params = [userId];

        if (status) {
            query += ` AND o.status = $2`;
            params.push(status);
        }

        query += ` ORDER BY o.created_at DESC
                   LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows.map(this.#flattenResult.bind(this));
    }

    // ─── Получение заказа по ID ───────────────────────────────────────────────────
    static async findById(id, userId) {
        const query = `
            SELECT o.*,
                   p.name as printer_name, p.type as printer_type,
                   m.name as material_name, m.category as material_category, m.type as material_type
            FROM orders o
            LEFT JOIN printers  p ON o.printer_id  = p.id
            LEFT JOIN materials m ON o.material_id = m.id
            WHERE o.id = $1 AND o.user_id = $2
        `;
        const result = await pool.query(query, [id, userId]);
        return this.#flattenResult(result.rows[0]);
    }

    // ─── Обновление заказа ────────────────────────────────────────────────────────
    static async update(id, userId, orderData) {
        const {
            printer_id,
            material_id,
            name,
            calc_materials,
            calc_electricity,
            calc_depreciation,
            calc_labor,
            calc_additional,
            calc_result,
            notes,
            settings,
        } = orderData;

        // Обновляем только переданные поля; JSONB-поля мержим (||) для частичных правок
        const query = `
            UPDATE orders
            SET name              = COALESCE($1,  name),
                printer_id        = COALESCE($2,  printer_id),
                material_id       = COALESCE($3,  material_id),
                calc_materials    = CASE WHEN $4::jsonb IS NOT NULL
                                         THEN calc_materials    || $4::jsonb
                                         ELSE calc_materials    END,
                calc_electricity  = CASE WHEN $5::jsonb IS NOT NULL
                                         THEN calc_electricity  || $5::jsonb
                                         ELSE calc_electricity  END,
                calc_depreciation = CASE WHEN $6::jsonb IS NOT NULL
                                         THEN calc_depreciation || $6::jsonb
                                         ELSE calc_depreciation END,
                calc_labor        = CASE WHEN $7::jsonb IS NOT NULL
                                         THEN calc_labor        || $7::jsonb
                                         ELSE calc_labor        END,
                calc_additional   = CASE WHEN $8::jsonb IS NOT NULL
                                         THEN calc_additional   || $8::jsonb
                                         ELSE calc_additional   END,
                calc_result       = CASE WHEN $9::jsonb IS NOT NULL
                                         THEN $9::jsonb
                                         ELSE calc_result       END,
                notes             = COALESCE($10, notes),
                settings          = settings || COALESCE($11::jsonb, '{}'::jsonb),
                updated_at        = CURRENT_TIMESTAMP
            WHERE id = $12 AND user_id = $13
            RETURNING *
        `;
        const values = [
            name        || null,
            printer_id  || null,
            material_id || null,
            calc_materials    ? JSON.stringify(calc_materials)    : null,
            calc_electricity  ? JSON.stringify(calc_electricity)  : null,
            calc_depreciation ? JSON.stringify(calc_depreciation) : null,
            calc_labor        ? JSON.stringify(calc_labor)        : null,
            calc_additional   ? JSON.stringify(calc_additional)   : null,
            calc_result       ? JSON.stringify(calc_result)       : null,
            notes       || null,
            settings    ? JSON.stringify(settings) : null,
            id,
            userId,
        ];
        const result = await pool.query(query, values);
        return this.#flattenResult(result.rows[0]);
    }

    // ─── Обновление статуса ───────────────────────────────────────────────────────
    static async updateStatus(id, userId, status) {
        const validStatuses = ['in_progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Недопустимый статус. Допустимые значения: ${validStatuses.join(', ')}`);
        }

        const query = `
            UPDATE orders
            SET status       = $1,
                completed_at = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END,
                updated_at   = CURRENT_TIMESTAMP
            WHERE id = $2 AND user_id = $3
            RETURNING *
        `;
        const result = await pool.query(query, [status, id, userId]);
        return this.#flattenResult(result.rows[0]);
    }

    static async markAsCompleted(id, userId) {
        return this.updateStatus(id, userId, 'completed');
    }

    static async markAsCancelled(id, userId) {
        return this.updateStatus(id, userId, 'cancelled');
    }

    // ─── Удаление заказа ─────────────────────────────────────────────────────────
    static async delete(id, userId) {
        const query = 'DELETE FROM orders WHERE id = $1 AND user_id = $2 RETURNING id';
        const result = await pool.query(query, [id, userId]);
        return result.rows[0];
    }

    // ─── Заказы по статусу ────────────────────────────────────────────────────────
    static async findByStatus(userId, status, limit = 100) {
        const query = `
            SELECT o.*,
                   p.name as printer_name,
                   m.name as material_name
            FROM orders o
            LEFT JOIN printers  p ON o.printer_id  = p.id
            LEFT JOIN materials m ON o.material_id = m.id
            WHERE o.user_id = $1 AND o.status = $2
            ORDER BY o.created_at DESC
            LIMIT $3
        `;
        const result = await pool.query(query, [userId, status, limit]);
        return result.rows.map(this.#flattenResult.bind(this));
    }

    // ─── Общая статистика ─────────────────────────────────────────────────────────
    // Используем вычисляемые столбцы total_cost / final_price для агрегации
    static async getStats(userId, period = 'all') {
        let dateFilter = '';
        const params = [userId];

        if (period === 'month') {
            dateFilter = "AND created_at >= date_trunc('month', CURRENT_DATE)";
        } else if (period === 'week') {
            dateFilter = "AND created_at >= date_trunc('week', CURRENT_DATE)";
        } else if (period === 'year') {
            dateFilter = "AND created_at >= date_trunc('year', CURRENT_DATE)";
        }

        const query = `
            SELECT
                COUNT(*)                                                                     AS total_orders,
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END)                          AS in_progress_orders,
                COUNT(CASE WHEN status = 'completed'   THEN 1 END)                          AS completed_orders,
                COUNT(CASE WHEN status = 'cancelled'   THEN 1 END)                          AS cancelled_orders,

                COALESCE(SUM(CASE WHEN status = 'completed' THEN final_price  ELSE 0 END), 0) AS total_revenue,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN (final_price - total_cost) ELSE 0 END), 0) AS total_profit,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN total_cost   ELSE 0 END), 0) AS total_expenses,

                COALESCE(SUM(CASE WHEN status = 'completed' THEN total_weight_grams ELSE 0 END), 0) AS total_filament_used,
                COALESCE(SUM(print_time_minutes), 0)                                         AS total_print_time,

                COALESCE(AVG(CASE WHEN status = 'completed' THEN final_price END), 0)        AS avg_order_value,
                MAX(final_price)                                                              AS max_order_value,
                MIN(CASE WHEN status = 'completed' THEN final_price END)                     AS min_order_value
            FROM orders
            WHERE user_id = $1
            ${dateFilter}
        `;

        const result = await pool.query(query, params);
        return result.rows[0];
    }

    // ─── Статистика по месяцам ────────────────────────────────────────────────────
    static async getMonthlyStats(userId, year = null) {
        if (!year) year = new Date().getFullYear();

        const query = `
            SELECT
                EXTRACT(MONTH FROM created_at)                                               AS month,
                COUNT(*)                                                                     AS orders_count,
                COUNT(CASE WHEN status = 'completed' THEN 1 END)                            AS completed_count,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END)                            AS cancelled_count,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN final_price        ELSE 0 END), 0) AS revenue,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN total_weight_grams ELSE 0 END), 0) AS filament_used
            FROM orders
            WHERE user_id = $1 AND EXTRACT(YEAR FROM created_at) = $2
            GROUP BY EXTRACT(MONTH FROM created_at)
            ORDER BY month
        `;
        const result = await pool.query(query, [userId, year]);
        return result.rows;
    }

    // ─── Статистика по статусам ───────────────────────────────────────────────────
    static async getStatusStats(userId) {
        const query = `
            SELECT
                status,
                COUNT(*)                             AS count,
                COALESCE(SUM(final_price), 0)        AS total_value,
                COALESCE(SUM(total_weight_grams), 0) AS total_weight
            FROM orders
            WHERE user_id = $1
            GROUP BY status
            ORDER BY
                CASE status
                    WHEN 'in_progress' THEN 1
                    WHEN 'completed'   THEN 2
                    WHEN 'cancelled'   THEN 3
                END
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    }

    // ─── Последние заказы ─────────────────────────────────────────────────────────
    static async getRecentOrders(userId, limit = 10) {
        const query = `
            SELECT o.*,
                   p.name as printer_name,
                   m.name as material_name
            FROM orders o
            LEFT JOIN printers  p ON o.printer_id  = p.id
            LEFT JOIN materials m ON o.material_id = m.id
            WHERE o.user_id = $1
            ORDER BY o.created_at DESC
            LIMIT $2
        `;
        const result = await pool.query(query, [userId, limit]);
        return result.rows.map(this.#flattenResult.bind(this));
    }

    // ─── Счётчики по статусам ─────────────────────────────────────────────────────
    static async countByStatus(userId) {
        const query = `
            SELECT
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END) AS in_progress,
                COUNT(CASE WHEN status = 'completed'   THEN 1 END) AS completed,
                COUNT(CASE WHEN status = 'cancelled'   THEN 1 END) AS cancelled
            FROM orders
            WHERE user_id = $1
        `;
        const result = await pool.query(query, [userId]);
        return result.rows[0];
    }
}

module.exports = OrderModel;