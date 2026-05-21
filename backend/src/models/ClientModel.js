// models/ClientModel.js
const pool = require('../config/database');

class ClientModel {
    // ─── CRUD ──────────────────────────────────────────────────────────────────

    static async create(userId, { name, phone, email, notes }) {
        const result = await pool.query(
            `INSERT INTO clients (user_id, name, phone, email, notes)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [userId, name, phone || null, email || null, notes || null]
        );
        return result.rows[0];
    }

    static async findByUser(userId) {
        const result = await pool.query(
            `SELECT * FROM clients WHERE user_id = $1 ORDER BY name`,
            [userId]
        );
        return result.rows;
    }

    static async findById(id, userId) {
        const result = await pool.query(
            `SELECT * FROM clients WHERE id = $1 AND user_id = $2`,
            [id, userId]
        );
        return result.rows[0] || null;
    }

    static async update(id, userId, { name, phone, email, notes }) {
        const result = await pool.query(
            `UPDATE clients
             SET name       = COALESCE($1, name),
                 phone      = COALESCE($2, phone),
                 email      = COALESCE($3, email),
                 notes      = COALESCE($4, notes),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5 AND user_id = $6
             RETURNING *`,
            [name || null, phone || null, email || null, notes || null, id, userId]
        );
        return result.rows[0] || null;
    }

    static async delete(id, userId) {
        const result = await pool.query(
            `DELETE FROM clients WHERE id = $1 AND user_id = $2 RETURNING id`,
            [id, userId]
        );
        return result.rows[0] || null;
    }

    // ─── Поиск по имени/контакту ───────────────────────────────────────────────
    static async search(userId, query) {
        const like = `%${query}%`;
        const result = await pool.query(
            `SELECT * FROM clients
             WHERE user_id = $1
               AND (name ILIKE $2 OR phone ILIKE $2 OR email ILIKE $2)
             ORDER BY name
             LIMIT 20`,
            [userId, like]
        );
        return result.rows;
    }
}

module.exports = ClientModel;
