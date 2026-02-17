// models/TokenModel.js
const pool = require('../config/database');

class TokenModel {
    // Создание таблицы для токенов
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
                
                CONSTRAINT unique_user_token UNIQUE (user_id, refresh_token)
            );
            
            CREATE INDEX IF NOT EXISTS idx_tokens_user_id ON tokens(user_id);
            CREATE INDEX IF NOT EXISTS idx_tokens_refresh_token ON tokens(refresh_token);
            CREATE INDEX IF NOT EXISTS idx_tokens_expires_at ON tokens(expires_at);
        `;
        await pool.query(query);
    }

    // Сохранение refresh токена
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
        
        const values = [userId, refreshToken, fingerprint, userAgent, ipAddress, expiresAt];
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // Поиск токена по значению
    static async findByToken(refreshToken) {
        const query = `
            SELECT 
                t.*, 
                u.id as user_id, 
                u.email, 
                u.username, 
                u.is_activated
            FROM tokens t
            INNER JOIN users u ON t.user_id = u.id
            WHERE t.refresh_token = $1
        `;
        const result = await pool.query(query, [refreshToken]);
        return result.rows[0];
    }

    // Поиск токена по значению (только валидные)
    static async findValidToken(refreshToken) {
        const query = `
            SELECT 
                t.*, 
                u.id as user_id, 
                u.email, 
                u.username, 
                u.is_activated
            FROM tokens t
            INNER JOIN users u ON t.user_id = u.id
            WHERE t.refresh_token = $1 AND t.expires_at > NOW()
        `;
        const result = await pool.query(query, [refreshToken]);
        return result.rows[0];
    }

    // Получение всех токенов пользователя
    static async findAllByUserId(userId) {
        const query = `
            SELECT id, fingerprint, user_agent, ip_address, created_at, expires_at
            FROM tokens 
            WHERE user_id = $1
            ORDER BY created_at DESC
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    }

    // Получение всех активных токенов пользователя
    static async findValidByUserId(userId) {
        const query = `
            SELECT id, fingerprint, user_agent, ip_address, created_at, expires_at
            FROM tokens 
            WHERE user_id = $1 AND expires_at > NOW()
            ORDER BY created_at DESC
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    }

    // Удаление токена
    static async deleteByToken(refreshToken) {
        const query = 'DELETE FROM tokens WHERE refresh_token = $1 RETURNING id';
        const result = await pool.query(query, [refreshToken]);
        return result.rows[0];
    }

    // Удаление всех токенов пользователя
    static async deleteAllByUserId(userId) {
        const query = 'DELETE FROM tokens WHERE user_id = $1';
        const result = await pool.query(query, [userId]);
        return result.rowCount;
    }

    // Удаление всех токенов пользователя кроме одного
    static async deleteAllExcept(userId, currentRefreshToken) {
        const query = 'DELETE FROM tokens WHERE user_id = $1 AND refresh_token != $2';
        const result = await pool.query(query, [userId, currentRefreshToken]);
        return result.rowCount;
    }

    // Удаление старых токенов (оставляем только N последних)
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

    // Удаление всех просроченных токенов
    static async deleteExpired() {
        const query = 'DELETE FROM tokens WHERE expires_at < NOW()';
        const result = await pool.query(query);
        return result.rowCount;
    }

    // Проверка существования токена
    static async exists(refreshToken) {
        const query = 'SELECT 1 FROM tokens WHERE refresh_token = $1';
        const result = await pool.query(query, [refreshToken]);
        return result.rowCount > 0;
    }

    // Проверка валидности токена
    static async isValid(refreshToken) {
        const query = 'SELECT 1 FROM tokens WHERE refresh_token = $1 AND expires_at > NOW()';
        const result = await pool.query(query, [refreshToken]);
        return result.rowCount > 0;
    }

    // Получение статистики по токенам пользователя
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

    // Транзакция: удалить старый токен и создать новый
    static async replaceToken(oldToken, newToken, userId, expiresAt, metadata = {}) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            // Удаляем старый токен
            await client.query(
                'DELETE FROM tokens WHERE refresh_token = $1',
                [oldToken]
            );

            // Создаем новый
            const { fingerprint, userAgent, ipAddress } = metadata;
            const insertResult = await client.query(
                `INSERT INTO tokens (user_id, refresh_token, fingerprint, user_agent, ip_address, expires_at)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [userId, newToken, fingerprint, userAgent, ipAddress, expiresAt]
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
}

module.exports = TokenModel;