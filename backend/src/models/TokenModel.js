// models/TokenModel.js
const pool = require('../config/database');

class TokenModel {
    // Создание таблиц
    static async createTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS tokens (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                refresh_token TEXT NOT NULL,
                fingerprint VARCHAR(255),
                user_agent TEXT,
                ip_address INET,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_access_jti VARCHAR(36),
                last_access_expires_at TIMESTAMP,

                CONSTRAINT unique_user_token UNIQUE (user_id, refresh_token)
            );

            CREATE INDEX IF NOT EXISTS idx_tokens_user_id ON tokens(user_id);
            CREATE INDEX IF NOT EXISTS idx_tokens_refresh_token ON tokens(refresh_token);
            CREATE INDEX IF NOT EXISTS idx_tokens_expires_at ON tokens(expires_at);

            CREATE TABLE IF NOT EXISTS token_denylist (
                jti VARCHAR(36) PRIMARY KEY,
                expires_at TIMESTAMP NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_denylist_expires_at ON token_denylist(expires_at);
        `;
        await pool.query(query);
    }

    // ─── CRUD токенов ─────────────────────────────────────────────────────────

    static async create(userId, refreshToken, expiresAt, metadata = {}) {
        const { fingerprint = null, userAgent = null, ipAddress = null } = metadata;
        const query = `
            INSERT INTO tokens (user_id, refresh_token, fingerprint, user_agent, ip_address, expires_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (user_id, refresh_token)
            DO UPDATE SET
                expires_at = EXCLUDED.expires_at,
                created_at = CURRENT_TIMESTAMP
            RETURNING *
        `;
        const result = await pool.query(query, [userId, refreshToken, fingerprint, userAgent, ipAddress, expiresAt]);
        return result.rows[0];
    }

    static async findByToken(refreshToken) {
        const query = `
            SELECT t.*, u.id as user_id, u.email, u.username, u.is_activated, u.role
            FROM tokens t
            INNER JOIN users u ON t.user_id = u.id
            WHERE t.refresh_token = $1
        `;
        const result = await pool.query(query, [refreshToken]);
        return result.rows[0];
    }

    static async findValidToken(refreshToken) {
        const query = `
            SELECT t.*, u.id as user_id, u.email, u.username, u.is_activated, u.role
            FROM tokens t
            INNER JOIN users u ON t.user_id = u.id
            WHERE t.refresh_token = $1 AND t.expires_at > NOW()
        `;
        const result = await pool.query(query, [refreshToken]);
        return result.rows[0];
    }

    static async findAllByUserId(userId) {
        const query = `
            SELECT id, fingerprint, user_agent, ip_address, created_at, expires_at,
                   last_access_jti, last_access_expires_at
            FROM tokens
            WHERE user_id = $1
            ORDER BY created_at DESC
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    }

    static async findValidByUserId(userId) {
        const query = `
            SELECT id, fingerprint, user_agent, ip_address, created_at, expires_at,
                   last_access_jti, last_access_expires_at
            FROM tokens
            WHERE user_id = $1 AND expires_at > NOW()
            ORDER BY created_at DESC
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    }

    static async deleteByToken(refreshToken) {
        const query = 'DELETE FROM tokens WHERE refresh_token = $1 RETURNING id';
        const result = await pool.query(query, [refreshToken]);
        return result.rows[0];
    }

    static async deleteAllByUserId(userId) {
        const query = 'DELETE FROM tokens WHERE user_id = $1';
        const result = await pool.query(query, [userId]);
        return result.rowCount;
    }

    static async deleteAllExcept(userId, currentRefreshToken) {
        const query = 'DELETE FROM tokens WHERE user_id = $1 AND refresh_token != $2';
        const result = await pool.query(query, [userId, currentRefreshToken]);
        return result.rowCount;
    }

    static async deleteOldTokens(userId, keepCount = 5) {
        const query = `
            DELETE FROM tokens
            WHERE user_id = $1
            AND id NOT IN (
                SELECT id FROM tokens
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT $2
            )
        `;
        const result = await pool.query(query, [userId, keepCount]);
        return result.rowCount;
    }

    static async deleteExpired() {
        const query = 'DELETE FROM tokens WHERE expires_at < NOW()';
        const result = await pool.query(query);
        return result.rowCount;
    }

    static async deleteByIdAndUserId(tokenId, userId) {
        const query = `
            DELETE FROM tokens
            WHERE id = $1 AND user_id = $2
            RETURNING id
        `;
        const result = await pool.query(query, [tokenId, userId]);
        return result.rows[0] ?? null;
    }

    static async exists(refreshToken) {
        const query = 'SELECT 1 FROM tokens WHERE refresh_token = $1';
        const result = await pool.query(query, [refreshToken]);
        return result.rowCount > 0;
    }

    static async isValid(refreshToken) {
        const query = 'SELECT 1 FROM tokens WHERE refresh_token = $1 AND expires_at > NOW()';
        const result = await pool.query(query, [refreshToken]);
        return result.rowCount > 0;
    }

    static async getUserStats(userId) {
        const query = `
            SELECT
                COUNT(*) as total_tokens,
                COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_tokens,
                COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_tokens,
                MIN(created_at) as oldest_token,
                MAX(created_at) as newest_token,
                COUNT(DISTINCT fingerprint) as unique_devices
            FROM tokens
            WHERE user_id = $1
        `;
        const result = await pool.query(query, [userId]);
        return result.rows[0];
    }

    // ─── Транзакция: заменить refresh токен ──────────────────────────────────
    static async replaceToken(oldToken, newToken, userId, expiresAt, metadata = {}) {
        const { fingerprint, userAgent, ipAddress } = metadata;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            await client.query(
                'DELETE FROM tokens WHERE refresh_token = $1',
                [oldToken]
            );

            const insertResult = await client.query(
                `INSERT INTO tokens (user_id, refresh_token, fingerprint, user_agent, ip_address, expires_at)
                 VALUES ($1, $2, $3, $4, $5::inet, $6)
                 RETURNING *`,
                [parseInt(userId), newToken, fingerprint ?? null, userAgent ?? null, ipAddress ?? null, expiresAt]
            );

            await client.query('COMMIT');
            return insertResult.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ─── Denylist ─────────────────────────────────────────────────────────────

    static async addToDenylist(jti, expiresAt) {
        const query = `
            INSERT INTO token_denylist (jti, expires_at)
            VALUES ($1, $2)
            ON CONFLICT (jti) DO NOTHING
        `;
        await pool.query(query, [jti, expiresAt]);
    }

    static async isInDenylist(jti) {
        const query = `
            SELECT 1 FROM token_denylist
            WHERE jti = $1 AND expires_at > NOW()
        `;
        const result = await pool.query(query, [jti]);
        return result.rowCount > 0;
    }

    static async cleanupDenylist() {
        const query = 'DELETE FROM token_denylist WHERE expires_at < NOW()';
        const result = await pool.query(query);
        return result.rowCount;
    }
}

module.exports = TokenModel;