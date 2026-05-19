// models/MaterialTransactionModel.js
const pool = require('../config/database');

/**
 * Таблица material_transactions — лог всех операций с остатком материала.
 *
 * Типы операций:
 *   reserve    — бронирование при создании заказа
 *   release    — снятие брони при отмене заказа
 *   consume    — фактическое списание при завершении заказа
 *   manual_add — ручное пополнение (добавление катушки / граммов)
 *   manual_sub — ручное уменьшение
 */
class MaterialTransactionModel {
    static async createTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS material_transactions (
                id              BIGSERIAL PRIMARY KEY,
                user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                material_id     BIGINT NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
                order_id        BIGINT REFERENCES orders(id) ON DELETE SET NULL,
                type            VARCHAR(20) NOT NULL
                                    CHECK (type IN ('reserve','release','consume','manual_add','manual_sub')),
                amount_grams    DECIMAL(10,2) NOT NULL,   -- > 0 для add/reserve/release, > 0 для consume/sub
                balance_before  DECIMAL(10,2) NOT NULL,   -- остаток ДО операции
                balance_after   DECIMAL(10,2) NOT NULL,   -- остаток ПОСЛЕ операции
                note            TEXT,
                created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_mat_tx_user     ON material_transactions(user_id);
            CREATE INDEX IF NOT EXISTS idx_mat_tx_material ON material_transactions(material_id);
            CREATE INDEX IF NOT EXISTS idx_mat_tx_order    ON material_transactions(order_id);
            CREATE INDEX IF NOT EXISTS idx_mat_tx_type     ON material_transactions(type);
            CREATE INDEX IF NOT EXISTS idx_mat_tx_created  ON material_transactions(created_at);

            -- Migration: add weight_per_spool_grams and stock_grams to materials if not exists
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'materials' AND column_name = 'weight_per_spool_grams'
                ) THEN
                    ALTER TABLE materials
                        ADD COLUMN weight_per_spool_grams DECIMAL(10,2) DEFAULT 1000 NOT NULL,
                        ADD COLUMN stock_grams            DECIMAL(10,2) DEFAULT 0    NOT NULL,
                        ADD COLUMN reserved_grams         DECIMAL(10,2) DEFAULT 0    NOT NULL;
                END IF;
            END $$;
        `;
        await pool.query(query);
    }

    // Записать транзакцию и вернуть её
    static async create(data) {
        const { user_id, material_id, order_id, type, amount_grams, balance_before, balance_after, note } = data;
        const query = `
            INSERT INTO material_transactions
                (user_id, material_id, order_id, type, amount_grams, balance_before, balance_after, note)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            RETURNING *
        `;
        const result = await pool.query(query, [
            user_id, material_id, order_id ?? null, type,
            amount_grams, balance_before, balance_after, note ?? null,
        ]);
        return result.rows[0];
    }

    // История для конкретного материала
    static async findByMaterial(materialId, userId, limit = 50, offset = 0) {
        const query = `
            SELECT t.*,
                   o.name AS order_name
            FROM material_transactions t
            LEFT JOIN orders o ON t.order_id = o.id
            WHERE t.material_id = $1 AND t.user_id = $2
            ORDER BY t.created_at DESC
            LIMIT $3 OFFSET $4
        `;
        const result = await pool.query(query, [materialId, userId, limit, offset]);
        return result.rows;
    }

    // История по заказу
    static async findByOrder(orderId, userId) {
        const query = `
            SELECT t.*,
                   m.name AS material_name
            FROM material_transactions t
            LEFT JOIN materials m ON t.material_id = m.id
            WHERE t.order_id = $1 AND t.user_id = $2
            ORDER BY t.created_at DESC
        `;
        const result = await pool.query(query, [orderId, userId]);
        return result.rows;
    }

    // Вся история пользователя
    static async findByUser(userId, limit = 100, offset = 0) {
        const query = `
            SELECT t.*,
                   m.name AS material_name,
                   o.name AS order_name
            FROM material_transactions t
            LEFT JOIN materials m ON t.material_id = m.id
            LEFT JOIN orders    o ON t.order_id    = o.id
            WHERE t.user_id = $1
            ORDER BY t.created_at DESC
            LIMIT $2 OFFSET $3
        `;
        const result = await pool.query(query, [userId, limit, offset]);
        return result.rows;
    }

    // Суммарный расход по материалу (только consume)
    static async getTotalConsumed(materialId, userId) {
        const query = `
            SELECT COALESCE(SUM(amount_grams), 0) AS total_grams
            FROM material_transactions
            WHERE material_id = $1 AND user_id = $2 AND type = 'consume'
        `;
        const result = await pool.query(query, [materialId, userId]);
        return parseFloat(result.rows[0].total_grams);
    }
}

module.exports = MaterialTransactionModel;