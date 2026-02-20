const pool = require('../config/database');

class PrinterModel {
    // Создание таблицы принтеров
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

    // Создание принтера
    static async create(userId, printerData) {
        const { name, type, model, purchase_price, print_lifetime_hours, power_consumption, is_default, settings } = printerData;

        // Если этот принтер делаем по умолчанию, сбрасываем флаг у других
        if (is_default) {
            await pool.query(
                'UPDATE printers SET is_default = false WHERE user_id = $1',
                [userId]
            );
        }

        const query = `
            INSERT INTO printers (user_id, name, type, model, purchase_price, print_lifetime_hours, power_consumption, is_default, settings)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        const values = [userId, name, type, model, purchase_price, print_lifetime_hours, power_consumption, is_default || false, settings || {}];
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // Получение всех принтеров пользователя
    static async findByUser(userId) {
        const query = 'SELECT * FROM printers WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC';
        const result = await pool.query(query, [userId]);
        return result.rows;
    }

    // Получение принтера по ID (проверка принадлежности пользователю)
    static async findById(id, userId) {
        const query = 'SELECT * FROM printers WHERE id = $1 AND user_id = $2';
        const result = await pool.query(query, [id, userId]);
        return result.rows[0];
    }

    // Получение принтера по умолчанию
    static async findDefault(userId) {
        const query = 'SELECT * FROM printers WHERE user_id = $1 AND is_default = true LIMIT 1';
        const result = await pool.query(query, [userId]);
        return result.rows[0] || null;
    }

    // Обновление принтера
    static async update(id, userId, printerData) {
        const { name, type, model, purchase_price, print_lifetime_hours, power_consumption, is_default, settings } = printerData;

        // Если этот принтер делаем по умолчанию, сбрасываем флаг у других
        if (is_default) {
            await pool.query(
                'UPDATE printers SET is_default = false WHERE user_id = $1',
                [userId]
            );
        }

        const query = `
            UPDATE printers 
            SET name = COALESCE($1, name),
                type = COALESCE($2, type),
                model = COALESCE($3, model),
                purchase_price = COALESCE($4, purchase_price),
                print_lifetime_hours = COALESCE($5, print_lifetime_hours),
                power_consumption = COALESCE($6, power_consumption),
                is_default = COALESCE($7, is_default),
                settings = settings || $8,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $9 AND user_id = $10
            RETURNING *
        `;
        const values = [name, type, model, purchase_price, print_lifetime_hours, power_consumption, is_default, settings, id, userId];
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // Удаление принтера
    static async delete(id, userId) {
        const query = 'DELETE FROM printers WHERE id = $1 AND user_id = $2 RETURNING id';
        const result = await pool.query(query, [id, userId]);
        return result.rows[0];
    }

    // Сделать принтер основным
    static async setDefault(id, userId) {
        await pool.query(
            'UPDATE printers SET is_default = false WHERE user_id = $1',
            [userId]
        );
        
        const query = 'UPDATE printers SET is_default = true WHERE id = $1 AND user_id = $2 RETURNING *';
        const result = await pool.query(query, [id, userId]);
        return result.rows[0];
    }

    // Получение статистики по принтерам пользователя
    static async getUserStats(userId) {
        const query = `
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN type = 'FDM' THEN 1 END) as fdm_count,
                COUNT(CASE WHEN type = 'SLA' THEN 1 END) as sla_count,
                COUNT(CASE WHEN is_default THEN 1 END) as default_count
            FROM printers 
            WHERE user_id = $1
        `;
        const result = await pool.query(query, [userId]);
        return result.rows[0];
    }
}

module.exports = PrinterModel;