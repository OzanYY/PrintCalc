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

            -- Новые колонки (из миграции 001)
            ALTER TABLE orders
                ADD COLUMN IF NOT EXISTS client_id BIGINT REFERENCES clients(id) ON DELETE SET NULL,
                ADD COLUMN IF NOT EXISTS deadline  DATE,
                ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN NOT NULL DEFAULT FALSE;

            CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
            CREATE INDEX IF NOT EXISTS idx_orders_deadline  ON orders(deadline) WHERE deadline IS NOT NULL;

            -- Триггер: автоматически выставляет is_urgent (дедлайн ≤ 2 дней)
            CREATE OR REPLACE FUNCTION orders_sync_urgent()
            RETURNS TRIGGER AS $$
            BEGIN
                IF NEW.deadline IS NOT NULL THEN
                    NEW.is_urgent := (NEW.deadline - CURRENT_DATE) <= 2;
                ELSE
                    NEW.is_urgent := FALSE;
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trg_orders_sync_urgent ON orders;
            CREATE TRIGGER trg_orders_sync_urgent
                BEFORE INSERT OR UPDATE OF deadline ON orders
                FOR EACH ROW EXECUTE FUNCTION orders_sync_urgent();
        `;
        await pool.query(query);
    }

    // ─── Вспомогательный метод: извлекает финансовые поля из calc_result ────────
    // Нужен для обратной совместимости — старый код мог читать плоские поля напрямую.
    static #flattenResult(row) {
        if (!row) return row;
        const r = row.calc_result || {};

        // pg возвращает DATE как JS Date (UTC midnight), при JSON-сериализации
        // в часовых поясах UTC+ это даёт предыдущий день. Нормализуем в YYYY-MM-DD.
        let deadline = row.deadline;
        if (deadline instanceof Date) {
            const y = deadline.getUTCFullYear();
            const m = String(deadline.getUTCMonth() + 1).padStart(2, '0');
            const d = String(deadline.getUTCDate()).padStart(2, '0');
            deadline = `${y}-${m}-${d}`;
        }

        return {
            ...row,
            deadline,
            // Плоские алиасы (read-only, не хранятся в БД отдельно)
            material_cost: r.materials?.total?.value ?? 0,
            electricity_cost: r.electricity?.value ?? 0,
            depreciation_cost: r.depreciation?.value ?? 0,
            labor_cost: r.labor?.value ?? 0,
            additional_expenses: r.additionalExpenses?.value ?? 0,
            // total_cost, margin_percent, final_price — вычисляемые столбцы в БД
        };
    }

    // ─── Создание заказа ─────────────────────────────────────────────────────────
    static async create(userId, orderData) {
        const {
            printer_id,
            material_id,
            client_id,          // ← НОВОЕ
            name,
            deadline,           // ← НОВОЕ
            calc_materials = {},
            calc_electricity = {},
            calc_depreciation = {},
            calc_labor = {},
            calc_additional = {},
            calc_result = {},
            notes,
            settings = {},
        } = orderData;

        const query = `
        INSERT INTO orders (
            user_id, printer_id, material_id, client_id, name, status,
            calc_materials, calc_electricity, calc_depreciation,
            calc_labor, calc_additional, calc_result,
            notes, settings, deadline
        ) VALUES (
            $1, $2, $3, $4, $5, 'in_progress',
            $6, $7, $8,
            $9, $10, $11,
            $12, $13, $14
        )
        RETURNING *
    `;
        const values = [
            userId,
            printer_id || null,
            material_id || null,
            client_id || null,    // ← НОВОЕ
            name,
            JSON.stringify(calc_materials),
            JSON.stringify(calc_electricity),
            JSON.stringify(calc_depreciation),
            JSON.stringify(calc_labor),
            JSON.stringify(calc_additional),
            JSON.stringify(calc_result),
            notes || null,
            JSON.stringify(settings),
            deadline || null,    // ← НОВОЕ
        ];
        const result = await pool.query(query, values);
        return this.#flattenResult(result.rows[0]);
    }

    // ─── Построение WHERE-условий из объекта фильтров ────────────────────────────
    static #buildFilters(userId, filters = {}) {
        const { status = null, tag_id = null, client_id = null, deadline_filter = null } = filters;
        const params = [userId];
        let where = 'WHERE o.user_id = $1';

        if (status) {
            params.push(status);
            where += ` AND o.status = $${params.length}`;
        }
        if (tag_id) {
            params.push(tag_id);
            where += ` AND EXISTS (SELECT 1 FROM order_tags ot2 WHERE ot2.order_id = o.id AND ot2.tag_id = $${params.length})`;
        }
        if (client_id) {
            params.push(client_id);
            where += ` AND o.client_id = $${params.length}`;
        }
        if (deadline_filter === 'has_deadline') {
            where += ` AND o.deadline IS NOT NULL`;
        } else if (deadline_filter === 'overdue') {
            where += ` AND o.deadline IS NOT NULL AND o.deadline < CURRENT_DATE AND o.status = 'in_progress'`;
        } else if (deadline_filter === 'this_week') {
            where += ` AND o.deadline IS NOT NULL AND o.deadline >= CURRENT_DATE AND o.deadline <= CURRENT_DATE + INTERVAL '7 days'`;
        }

        return { where, params };
    }

    // ─── Получение всех заказов пользователя ─────────────────────────────────────
    static async findByUser(userId, filters = {}, limit = 50, offset = 0) {
        const { where, params } = this.#buildFilters(userId, filters);

        const query = `
        SELECT o.*,
               p.name as printer_name, p.type as printer_type,
               m.name as material_name, m.category as material_category, m.type as material_type,
               c.name as client_name, c.phone as client_phone, c.email as client_email,
               COALESCE(
                   (SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color) ORDER BY t.name)
                    FROM order_tags ot JOIN tags t ON t.id = ot.tag_id
                    WHERE ot.order_id = o.id),
                   '[]'::json
               ) AS tags,
               (SELECT COUNT(*) FROM order_comments WHERE order_id = o.id) AS comments_count
        FROM orders o
        LEFT JOIN printers  p ON o.printer_id  = p.id
        LEFT JOIN materials m ON o.material_id = m.id
        LEFT JOIN clients   c ON o.client_id   = c.id
        ${where}
        ORDER BY o.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;
        params.push(limit, offset);
        const result = await pool.query(query, params);
        return result.rows.map(this.#flattenResult.bind(this));
    }

    // ─── Количество заказов с учётом фильтров (для пагинации) ────────────────────
    static async countByUser(userId, filters = {}) {
        const { where, params } = this.#buildFilters(userId, filters);
        const query = `SELECT COUNT(*) FROM orders o ${where}`;
        const result = await pool.query(query, params);
        return parseInt(result.rows[0].count) || 0;
    }

    // ─── Получение заказа по ID ───────────────────────────────────────────────────
    static async findById(id, userId) {
        const query = `
        SELECT o.*,
               p.name as printer_name, p.type as printer_type,
               m.name as material_name, m.category as material_category, m.type as material_type,
               c.name as client_name, c.phone as client_phone, c.email as client_email,
               COALESCE(
                   (SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color) ORDER BY t.name)
                    FROM order_tags ot JOIN tags t ON t.id = ot.tag_id
                    WHERE ot.order_id = o.id),
                   '[]'::json
               ) AS tags,
               (SELECT COUNT(*) FROM order_comments WHERE order_id = o.id) AS comments_count
        FROM orders o
        LEFT JOIN printers  p ON o.printer_id  = p.id
        LEFT JOIN materials m ON o.material_id = m.id
        LEFT JOIN clients   c ON o.client_id   = c.id
        WHERE o.id = $1 AND o.user_id = $2
    `;
        const result = await pool.query(query, [id, userId]);
        return this.#flattenResult(result.rows[0]);
    }

    static async findByTag(userId, tagId, limit = 50, offset = 0) {
        const query = `
        SELECT o.*,
               p.name as printer_name,
               m.name as material_name,
               c.name as client_name, c.phone as client_phone, c.email as client_email
        FROM orders o
        JOIN order_tags ot ON ot.order_id = o.id AND ot.tag_id = $2
        LEFT JOIN printers  p ON o.printer_id  = p.id
        LEFT JOIN materials m ON o.material_id = m.id
        LEFT JOIN clients   c ON o.client_id   = c.id
        WHERE o.user_id = $1
        ORDER BY o.created_at DESC
        LIMIT $3 OFFSET $4
    `;
        const result = await pool.query(query, [userId, tagId, limit, offset]);
        return result.rows.map(this.#flattenResult.bind(this));
    }

    static async findOverdueAndUrgent(userId) {
        const query = `
        SELECT o.*,
               c.name as client_name, c.phone as client_phone, c.email as client_email
        FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        WHERE o.user_id = $1
          AND o.status  = 'in_progress'
          AND o.deadline IS NOT NULL
          AND o.deadline <= CURRENT_DATE + INTERVAL '2 days'
        ORDER BY o.deadline ASC
    `;
        const result = await pool.query(query, [userId]);
        return result.rows.map(this.#flattenResult.bind(this));
    }

    // ─── Обновление заказа ────────────────────────────────────────────────────────
    static async update(id, userId, orderData) {
        const {
            printer_id,
            material_id,
            client_id,
            name,
            deadline,
            calc_materials,
            calc_electricity,
            calc_depreciation,
            calc_labor,
            calc_additional,
            calc_result,
            notes,
            settings,
        } = orderData;

        // Флаги: undefined = не трогать поле; null = явно сбросить в NULL; значение = обновить
        const hasName       = name        !== undefined;
        const hasClientId   = client_id   !== undefined;
        const hasDeadline   = deadline    !== undefined;
        const hasNotes      = notes       !== undefined;
        const hasPrinter    = printer_id  !== undefined;
        const hasMaterial   = material_id !== undefined;

        const query = `
        UPDATE orders
        SET name              = CASE WHEN $1::boolean THEN $2          ELSE name              END,
            printer_id        = CASE WHEN $3::boolean THEN $4::bigint  ELSE printer_id        END,
            material_id       = CASE WHEN $5::boolean THEN $6::bigint  ELSE material_id       END,
            client_id         = CASE WHEN $7::boolean THEN $8::bigint  ELSE client_id         END,
            deadline          = CASE WHEN $9::boolean THEN $10::date   ELSE deadline          END,
            notes             = CASE WHEN $11::boolean THEN $12        ELSE notes             END,
            calc_materials    = CASE WHEN $13::jsonb IS NOT NULL THEN calc_materials    || $13::jsonb ELSE calc_materials    END,
            calc_electricity  = CASE WHEN $14::jsonb IS NOT NULL THEN calc_electricity  || $14::jsonb ELSE calc_electricity  END,
            calc_depreciation = CASE WHEN $15::jsonb IS NOT NULL THEN calc_depreciation || $15::jsonb ELSE calc_depreciation END,
            calc_labor        = CASE WHEN $16::jsonb IS NOT NULL THEN calc_labor        || $16::jsonb ELSE calc_labor        END,
            calc_additional   = CASE WHEN $17::jsonb IS NOT NULL THEN calc_additional   || $17::jsonb ELSE calc_additional   END,
            calc_result       = CASE WHEN $18::jsonb IS NOT NULL THEN $18::jsonb        ELSE calc_result                    END,
            settings          = settings || COALESCE($19::jsonb, '{}'::jsonb),
            updated_at        = CURRENT_TIMESTAMP
        WHERE id = $20 AND user_id = $21
        RETURNING *
    `;
        const values = [
            hasName,       name ?? null,
            hasPrinter,    printer_id  ?? null,
            hasMaterial,   material_id ?? null,
            hasClientId,   client_id   ?? null,
            hasDeadline,   deadline    ?? null,
            hasNotes,      notes       ?? null,
            calc_materials    ? JSON.stringify(calc_materials)    : null,
            calc_electricity  ? JSON.stringify(calc_electricity)  : null,
            calc_depreciation ? JSON.stringify(calc_depreciation) : null,
            calc_labor        ? JSON.stringify(calc_labor)        : null,
            calc_additional   ? JSON.stringify(calc_additional)   : null,
            calc_result       ? JSON.stringify(calc_result)       : null,
            settings ? JSON.stringify(settings) : null,
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
            SET status       = $1::VARCHAR,
                completed_at = CASE WHEN $1::VARCHAR = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END,
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

    // ─── Массовое обновление статусов (один запрос) ───────────────────────────────
    static async bulkUpdateStatus(userId, orderIds, newStatus) {
        if (!orderIds.length) return [];
        // Параметры: $1=userId, $2=status, $3...=ids
        const idPlaceholders = orderIds.map((_, i) => `${i + 3}`).join(', ');
        const completedAt = newStatus === 'completed' ? 'CURRENT_TIMESTAMP' : 'NULL';
        const query = `
            UPDATE orders
            SET status = $2,
                completed_at = ${completedAt},
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $1
              AND id IN (${idPlaceholders})
            RETURNING id, status, updated_at
        `;
        const result = await pool.query(query, [userId, newStatus, ...orderIds]);
        return result.rows;
    }
}

module.exports = OrderModel;