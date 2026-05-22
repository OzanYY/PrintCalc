// models/OrderCommentModel.js
const pool = require('../config/database');

class OrderCommentModel {
    static async createTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS order_comments (
                id         BIGSERIAL PRIMARY KEY,
                order_id   BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                body       TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_order_comments_order_id ON order_comments(order_id);
            CREATE INDEX IF NOT EXISTS idx_order_comments_user     ON order_comments(user_id);

            CREATE OR REPLACE FUNCTION set_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trg_order_comments_updated ON order_comments;
            CREATE TRIGGER trg_order_comments_updated
                BEFORE UPDATE ON order_comments
                FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        `;
        await pool.query(query);
    }

    static async findByOrder(orderId) {
        const result = await pool.query(
            `SELECT c.*, u.name AS author_name
             FROM order_comments c
             JOIN users u ON u.id = c.user_id
             WHERE c.order_id = $1
             ORDER BY c.created_at ASC`,
            [orderId]
        );
        return result.rows;
    }

    static async create(orderId, userId, body) {
        const result = await pool.query(
            `INSERT INTO order_comments (order_id, user_id, body)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [orderId, userId, body.trim()]
        );
        return result.rows[0];
    }

    static async update(id, userId, body) {
        const result = await pool.query(
            `UPDATE order_comments
             SET body = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 AND user_id = $3
             RETURNING *`,
            [body.trim(), id, userId]
        );
        return result.rows[0] || null;
    }

    static async delete(id, userId) {
        const result = await pool.query(
            `DELETE FROM order_comments
             WHERE id = $1 AND user_id = $2
             RETURNING id`,
            [id, userId]
        );
        return result.rows[0] || null;
    }
}

module.exports = OrderCommentModel;