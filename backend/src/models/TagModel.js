// models/TagModel.js
const pool = require('../config/database');

class TagModel {
    // ─── Теги пользователя ─────────────────────────────────────────────────────

    static async findByUser(userId) {
        const result = await pool.query(
            `SELECT t.*, COUNT(ot.order_id)::int AS orders_count
             FROM tags t
             LEFT JOIN order_tags ot ON ot.tag_id = t.id
             WHERE t.user_id = $1
             GROUP BY t.id
             ORDER BY t.name`,
            [userId]
        );
        return result.rows;
    }

    static async create(userId, { name, color = '#6366f1' }) {
        const result = await pool.query(
            `INSERT INTO tags (user_id, name, color)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, name) DO UPDATE SET color = EXCLUDED.color
             RETURNING *`,
            [userId, name.trim(), color]
        );
        return result.rows[0];
    }

    static async update(id, userId, { name, color }) {
        const result = await pool.query(
            `UPDATE tags
             SET name  = COALESCE($1, name),
                 color = COALESCE($2, color)
             WHERE id = $3 AND user_id = $4
             RETURNING *`,
            [name || null, color || null, id, userId]
        );
        return result.rows[0] || null;
    }

    static async delete(id, userId) {
        const result = await pool.query(
            `DELETE FROM tags WHERE id = $1 AND user_id = $2 RETURNING id`,
            [id, userId]
        );
        return result.rows[0] || null;
    }

    // ─── Теги конкретного заказа ───────────────────────────────────────────────

    static async getOrderTags(orderId) {
        const result = await pool.query(
            `SELECT t.* FROM tags t
             JOIN order_tags ot ON ot.tag_id = t.id
             WHERE ot.order_id = $1
             ORDER BY t.name`,
            [orderId]
        );
        return result.rows;
    }

    /** Заменяет теги заказа на переданный список tag_id */
    static async setOrderTags(orderId, tagIds = []) {
        await pool.query(`DELETE FROM order_tags WHERE order_id = $1`, [orderId]);
        if (tagIds.length === 0) return [];
        const placeholders = tagIds.map((_, i) => `($1, $${i + 2})`).join(', ');
        await pool.query(
            `INSERT INTO order_tags (order_id, tag_id) VALUES ${placeholders}
             ON CONFLICT DO NOTHING`,
            [orderId, ...tagIds]
        );
        return this.getOrderTags(orderId);
    }

    /** Добавляет один тег к заказу */
    static async addOrderTag(orderId, tagId) {
        await pool.query(
            `INSERT INTO order_tags (order_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [orderId, tagId]
        );
        return this.getOrderTags(orderId);
    }

    /** Убирает один тег из заказа */
    static async removeOrderTag(orderId, tagId) {
        await pool.query(
            `DELETE FROM order_tags WHERE order_id = $1 AND tag_id = $2`,
            [orderId, tagId]
        );
        return this.getOrderTags(orderId);
    }
}

module.exports = TagModel;
