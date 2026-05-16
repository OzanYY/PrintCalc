const pool = require('../config/database');

const VALID_TYPES = ['FDM', 'SLA', 'SLS', 'PolyJet'];

class PrinterModel {
    static async createTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS printers (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                type VARCHAR(20) NOT NULL CHECK (type IN ('FDM', 'SLA', 'SLS', 'PolyJet')),
                model VARCHAR(100),
                purchase_price DECIMAL(10,2) DEFAULT 0,
                print_lifetime_hours INTEGER DEFAULT 0,
                power_consumption DECIMAL(10,2) DEFAULT 0,
                is_default BOOLEAN DEFAULT false,
                settings JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_printers_user_id ON printers(user_id);
            CREATE INDEX IF NOT EXISTS idx_printers_type ON printers(type);
            CREATE INDEX IF NOT EXISTS idx_printers_default ON printers(user_id, is_default);
        `;
        await pool.query(query);
    }

    // ─── Вспомогательный метод: сброс флага is_default ───────────────────────
    static async #clearDefault(userId) {
        await pool.query(
            'UPDATE printers SET is_default = false WHERE user_id = $1',
            [userId]
        );
    }

    // ─── Создание ─────────────────────────────────────────────────────────────
    static async create(userId, printerData) {
        const {
            name, type, model,
            purchase_price = 0,
            print_lifetime_hours = 0,
            power_consumption = 0,
            is_default = false,
            settings = {},
        } = printerData;

        if (is_default) await this.#clearDefault(userId);

        const query = `
            INSERT INTO printers (
                user_id, name, type, model,
                purchase_price, print_lifetime_hours, power_consumption,
                is_default, settings
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        const result = await pool.query(query, [
            userId, name, type, model,
            purchase_price, print_lifetime_hours, power_consumption,
            is_default, JSON.stringify(settings),
        ]);
        return result.rows[0];
    }

    // ─── Список принтеров пользователя ───────────────────────────────────────
    static async findByUser(userId) {
        const result = await pool.query(
            'SELECT * FROM printers WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
            [userId]
        );
        return result.rows;
    }

    // ─── Принтер по ID ────────────────────────────────────────────────────────
    static async findById(id, userId) {
        const result = await pool.query(
            'SELECT * FROM printers WHERE id = $1 AND user_id = $2',
            [id, userId]
        );
        return result.rows[0] ?? null;
    }

    // ─── Принтер по умолчанию ─────────────────────────────────────────────────
    static async findDefault(userId) {
        const result = await pool.query(
            'SELECT * FROM printers WHERE user_id = $1 AND is_default = true LIMIT 1',
            [userId]
        );
        return result.rows[0] ?? null;
    }

    // ─── Обновление ───────────────────────────────────────────────────────────
    static async update(id, userId, printerData) {
        const {
            name, type, model,
            purchase_price, print_lifetime_hours, power_consumption,
            is_default, settings,
        } = printerData;

        if (is_default) await this.#clearDefault(userId);

        const query = `
            UPDATE printers
            SET name                 = COALESCE($1,  name),
                type                 = COALESCE($2,  type),
                model                = COALESCE($3,  model),
                purchase_price       = COALESCE($4,  purchase_price),
                print_lifetime_hours = COALESCE($5,  print_lifetime_hours),
                power_consumption    = COALESCE($6,  power_consumption),
                is_default           = COALESCE($7,  is_default),
                settings             = settings || COALESCE($8::jsonb, '{}'::jsonb),
                updated_at           = CURRENT_TIMESTAMP
            WHERE id = $9 AND user_id = $10
            RETURNING *
        `;
        const result = await pool.query(query, [
            name ?? null, type ?? null, model ?? null,
            purchase_price ?? null, print_lifetime_hours ?? null, power_consumption ?? null,
            is_default ?? null,
            settings ? JSON.stringify(settings) : null,
            id, userId,
        ]);
        return result.rows[0] ?? null;
    }

    // ─── Удаление ─────────────────────────────────────────────────────────────
    static async delete(id, userId) {
        const result = await pool.query(
            'DELETE FROM printers WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, userId]
        );
        return result.rows[0] ?? null;
    }

    // ─── Установить по умолчанию ──────────────────────────────────────────────
    static async setDefault(id, userId) {
        await this.#clearDefault(userId);
        const result = await pool.query(
            'UPDATE printers SET is_default = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, userId]
        );
        return result.rows[0] ?? null;
    }

    // ─── Статистика ───────────────────────────────────────────────────────────
    static async getUserStats(userId) {
        const query = `
            SELECT
                COUNT(*)                                          AS total,
                COUNT(CASE WHEN type = 'FDM'     THEN 1 END)    AS fdm_count,
                COUNT(CASE WHEN type = 'SLA'     THEN 1 END)    AS sla_count,
                COUNT(CASE WHEN type = 'SLS'     THEN 1 END)    AS sls_count,
                COUNT(CASE WHEN type = 'PolyJet' THEN 1 END)    AS polyjet_count,
                COUNT(CASE WHEN is_default        THEN 1 END)   AS default_count
            FROM printers
            WHERE user_id = $1
        `;
        const result = await pool.query(query, [userId]);
        return result.rows[0];
    }
}

module.exports = { PrinterModel, VALID_TYPES };