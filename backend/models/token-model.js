// models/Token.js
const pool = require('../database');
const crypto = require('crypto');

class Token {
    constructor(data = {}) {
        this.id = data.id;
        this.userId = data.user_id;
        this.tokenType = data.token_type; // 'refresh', 'access', 'activation', 'reset'
        this.token = data.token;
        this.expiresAt = data.expires_at;
        this.isUsed = data.is_used || false;
        this.usedAt = data.used_at;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
    }

    // Генерация случайного токена
    static generateToken(bytes = 32) {
        return crypto.randomBytes(bytes).toString('hex');
    }

    // Создание нового токена (аналог new Token().save())
    static async create(tokenData) {
        const { userId, tokenType, expiresIn } = tokenData;
        
        // Генерируем токен
        const token = this.generateToken();
        
        // Рассчитываем дату истечения
        const expiresAt = new Date(Date.now() + expiresIn);

        const query = `
            INSERT INTO tokens (user_id, token_type, token, expires_at)
            VALUES ($1, $2, $3, $4)
            RETURNING id, user_id, token_type, token, expires_at, is_used, created_at
        `;

        const values = [userId, tokenType, token, expiresAt];

        try {
            const result = await pool.query(query, values);
            return new Token(result.rows[0]);
        } catch (error) {
            if (error.code === '23505') { // unique_violation
                throw new Error('Token already exists for this user');
            }
            throw error;
        }
    }

    // Поиск токена по значению (аналог findOne({ token }))
    static async findByToken(token, tokenType = null) {
        let query = 'SELECT * FROM tokens WHERE token = $1';
        const values = [token];

        if (tokenType) {
            query += ' AND token_type = $2';
            values.push(tokenType);
        }

        const result = await pool.query(query, values);
        return result.rows[0] ? new Token(result.rows[0]) : null;
    }

    // Поиск всех токенов пользователя
    static async findByUser(userId, tokenType = null) {
        let query = 'SELECT * FROM tokens WHERE user_id = $1';
        const values = [userId];

        if (tokenType) {
            query += ' AND token_type = $2';
            values.push(tokenType);
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, values);
        return result.rows.map(row => new Token(row));
    }

    // Поиск активного refresh токена пользователя
    static async findActiveRefreshToken(userId) {
        const query = `
            SELECT * FROM tokens 
            WHERE user_id = $1 
                AND token_type = 'refresh' 
                AND is_used = false 
                AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT 1
        `;
        
        const result = await pool.query(query, [userId]);
        return result.rows[0] ? new Token(result.rows[0]) : null;
    }

    // Поиск валидного токена
    static async findValidToken(token, tokenType) {
        const query = `
            SELECT * FROM tokens 
            WHERE token = $1 
                AND token_type = $2 
                AND is_used = false 
                AND expires_at > NOW()
        `;
        
        const result = await pool.query(query, [token, tokenType]);
        return result.rows[0] ? new Token(result.rows[0]) : null;
    }

    // Отметить токен как использованный
    async markAsUsed() {
        const query = `
            UPDATE tokens 
            SET is_used = true, used_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        
        const result = await pool.query(query, [this.id]);
        Object.assign(this, new Token(result.rows[0]));
        return this;
    }

    // Проверка валидности токена
    isValid() {
        return !this.isUsed && new Date(this.expiresAt) > new Date();
    }

    // Деактивировать все токены пользователя определенного типа
    static async deactivateAllUserTokens(userId, tokenType) {
        const query = `
            UPDATE tokens 
            SET is_used = true, used_at = CURRENT_TIMESTAMP
            WHERE user_id = $1 AND token_type = $2 AND is_used = false
            RETURNING id
        `;
        
        const result = await pool.query(query, [userId, tokenType]);
        return result.rowCount;
    }

    // Удалить все просроченные токены
    static async cleanupExpired() {
        const query = `
            DELETE FROM tokens 
            WHERE expires_at < NOW() OR is_used = true
            RETURNING id
        `;
        
        const result = await pool.query(query);
        return result.rowCount;
    }

    // Удалить токен
    async delete() {
        const query = 'DELETE FROM tokens WHERE id = $1 RETURNING id';
        const result = await pool.query(query, [this.id]);
        return result.rows[0] ? true : false;
    }

    // Аналог mongoose save() - сохраняет текущие изменения
    async saveToken() {
        const query = `
            UPDATE tokens 
            SET token = $1,
                token_type = $2,
                expires_at = $3,
                is_used = $4,
                used_at = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *
        `;

        const values = [
            this.token,
            this.tokenType,
            this.expiresAt,
            this.isUsed,
            this.usedAt,
            this.id
        ];

        try {
            const result = await pool.query(query, values);
            Object.assign(this, new Token(result.rows[0]));
            return this;
        } catch (error) {
            console.error('Error saving token:', error);
            throw error;
        }
    }

    // Метод для преобразования в JSON
    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            tokenType: this.tokenType,
            token: this.token,
            expiresAt: this.expiresAt,
            isUsed: this.isUsed,
            usedAt: this.usedAt,
            createdAt: this.createdAt,
            isValid: this.isValid()
        };
    }
}

module.exports = Token;