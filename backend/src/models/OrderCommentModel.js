// models/OrderCommentModel.js
const pool = require('../config/database');

class OrderCommentModel {
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
