const pool = require('../config/database');

class NotificationModel {
    static async createTable() {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id         BIGSERIAL PRIMARY KEY,
                user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type       VARCHAR(50) NOT NULL,
                data       JSONB NOT NULL DEFAULT '{}',
                is_read    BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_notifications_user
                ON notifications(user_id, is_read);
            CREATE INDEX IF NOT EXISTS idx_notifications_user_ts
                ON notifications(user_id, created_at DESC);
        `);
    }

    static async create(userId, type, data = {}) {
        const result = await pool.query(
            `INSERT INTO notifications (user_id, type, data)
             VALUES ($1, $2, $3) RETURNING *`,
            [userId, type, JSON.stringify(data)]
        );
        return result.rows[0];
    }

    static async findByUser(userId, { limit = 30, offset = 0 } = {}) {
        const result = await pool.query(
            `SELECT * FROM notifications
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );
        return result.rows;
    }

    static async getUnreadCount(userId) {
        const result = await pool.query(
            'SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
            [userId]
        );
        return Number(result.rows[0].count);
    }

    static async markRead(id, userId) {
        const result = await pool.query(
            `UPDATE notifications SET is_read = TRUE
             WHERE id = $1 AND user_id = $2 RETURNING *`,
            [id, userId]
        );
        return result.rows[0] ?? null;
    }

    static async markAllRead(userId) {
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
            [userId]
        );
    }

    static async delete(id, userId) {
        const result = await pool.query(
            'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, userId]
        );
        return result.rows[0] ?? null;
    }
}

module.exports = NotificationModel;
