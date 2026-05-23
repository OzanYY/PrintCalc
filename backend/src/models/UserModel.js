// models/UserModel.js
const pool = require('../config/database');

class UserModel {
    static async createTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS users (
                id BIGSERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                is_activated BOOLEAN DEFAULT FALSE,
                activation_link VARCHAR(255),
                reset_password_token VARCHAR(255),
                reset_password_expires TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
            CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_password_token);

            -- Migration: add role column if not exists
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'users' AND column_name = 'role'
                ) THEN
                    ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'
                        CHECK (role IN ('user', 'admin'));
                END IF;
            END $$;

            -- Migration: add deletion_warning_sent column if not exists
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'users' AND column_name = 'deletion_warning_sent'
                ) THEN
                    ALTER TABLE users ADD COLUMN deletion_warning_sent BOOLEAN NOT NULL DEFAULT FALSE;
                END IF;
            END $$;

            -- Migration: add avatar column if not exists
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'users' AND column_name = 'avatar'
                ) THEN
                    ALTER TABLE users ADD COLUMN avatar TEXT;
                END IF;
            END $$;
        `;
        await pool.query(query);
    }

    static async create({ username, email, password_hash, activation_link }) {
        const query = `
            INSERT INTO users (username, email, password_hash, activation_link)
            VALUES ($1, $2, $3, $4)
            RETURNING id, username, email, is_activated, role, created_at
        `;
        const values = [username, email, password_hash, activation_link];
        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await pool.query(query, [email]);
        return result.rows[0];
    }

    static async findByUsername(username) {
        const query = 'SELECT * FROM users WHERE username = $1';
        const result = await pool.query(query, [username]);
        return result.rows[0];
    }

    static async findById(id) {
        const query = `
            SELECT id, username, email, is_activated, role, created_at, avatar
            FROM users
            WHERE id = $1
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async findByIdWithHash(id) {
        const query = 'SELECT * FROM users WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async findByActivationLink(link) {
        const query = 'SELECT * FROM users WHERE activation_link = $1';
        const result = await pool.query(query, [link]);
        return result.rows[0];
    }

    static async setActivationLink(id, activation_link) {
        const query = `
            UPDATE users SET activation_link = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 RETURNING id
        `;
        const result = await pool.query(query, [activation_link, id]);
        return result.rows[0];
    }

    static async activateUser(id) {
        const query = `
            UPDATE users 
            SET is_activated = TRUE, activation_link = NULL 
            WHERE id = $1 
            RETURNING id, username, email, is_activated, role
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async updateAvatar(id, avatarUrl) {
        const query = `
            UPDATE users SET avatar = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id, username, email, is_activated, role, created_at, avatar
        `;
        const result = await pool.query(query, [avatarUrl, id]);
        return result.rows[0];
    }

    static async update(id, { username, email }) {
        const query = `
            UPDATE users
            SET username = COALESCE($1, username),
                email = COALESCE($2, email),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING id, username, email, is_activated, role, created_at, avatar
        `;
        const values = [username, email, id];
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    static async updatePasswordHash(id, password_hash) {
        const query = `
            UPDATE users 
            SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 
            RETURNING id
        `;
        const result = await pool.query(query, [password_hash, id]);
        return result.rows[0];
    }

    static async delete(id) {
        const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async setResetToken(userId, token, expiresAt) {
        const query = `
            UPDATE users 
            SET reset_password_token = $1, 
                reset_password_expires = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING id
        `;
        const result = await pool.query(query, [token, expiresAt, userId]);
        return result.rows[0];
    }

    static async findByResetToken(token) {
        const query = 'SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()';
        const result = await pool.query(query, [token]);
        return result.rows[0];
    }

    static async clearResetToken(userId) {
        const query = `
            UPDATE users 
            SET reset_password_token = NULL, 
                reset_password_expires = NULL 
            WHERE id = $1
        `;
        await pool.query(query, [userId]);
    }

    // ─── Cleanup: unactivated accounts ───────────────────────────────────────
    static async deleteUnactivatedExpired() {
        const query = `
            DELETE FROM users
            WHERE is_activated = FALSE
              AND created_at < NOW() - INTERVAL '14 days'
            RETURNING id, email, username
        `;
        const result = await pool.query(query);
        return result.rows;
    }

    static async findUnactivatedExpiringSoon() {
        const query = `
            SELECT id, email, username, activation_link
            FROM users
            WHERE is_activated = FALSE
              AND deletion_warning_sent = FALSE
              AND created_at < NOW() - INTERVAL '13 days'
              AND created_at >= NOW() - INTERVAL '14 days'
        `;
        const result = await pool.query(query);
        return result.rows;
    }

    static async markDeletionWarningSent(id) {
        await pool.query(
            'UPDATE users SET deletion_warning_sent = TRUE WHERE id = $1',
            [id]
        );
    }

    // ─── Admin methods ────────────────────────────────────────────────────────
    static async findAll() {
        const query = `
            SELECT id, username, email, is_activated, role, created_at, updated_at
            FROM users
            ORDER BY created_at DESC
        `;
        const result = await pool.query(query);
        return result.rows;
    }

    static async adminUpdate(id, { username, email, is_activated }) {
        const query = `
            UPDATE users 
            SET username = COALESCE($1, username),
                email = COALESCE($2, email),
                is_activated = COALESCE($3, is_activated),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING id, username, email, is_activated, role, created_at, updated_at
        `;
        const result = await pool.query(query, [username, email, is_activated, id]);
        return result.rows[0];
    }
}

module.exports = UserModel;