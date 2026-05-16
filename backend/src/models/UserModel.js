// models/UserModel.js
const pool = require('../config/database');

class UserModel {
    // Создание таблицы (если не существует)
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
        `;
        await pool.query(query);
    }

    // Создание пользователя (принимает уже готовый password_hash)
    static async create({ username, email, password_hash, activation_link }) {
        const query = `
            INSERT INTO users (username, email, password_hash, activation_link)
            VALUES ($1, $2, $3, $4)
            RETURNING id, username, email, is_activated, created_at
        `;
        const values = [username, email, password_hash, activation_link];

        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            // Пробрасываем ошибку дальше, не обрабатываем здесь
            throw error;
        }
    }

    // Поиск пользователя по email (полные данные, включая пароль)
    static async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await pool.query(query, [email]);
        return result.rows[0];
    }

    // Поиск пользователя по username
    static async findByUsername(username) {
        const query = 'SELECT * FROM users WHERE username = $1';
        const result = await pool.query(query, [username]);
        return result.rows[0];
    }

    // Поиск пользователя по ID (без пароля)
    static async findById(id) {
        const query = `
            SELECT id, username, email, is_activated, created_at
            FROM users 
            WHERE id = $1
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    // Поиск по ссылке активации
    static async findByActivationLink(link) {
        const query = 'SELECT * FROM users WHERE activation_link = $1';
        const result = await pool.query(query, [link]);
        return result.rows[0];
    }

    // Активация пользователя
    static async activateUser(id) {
        const query = `
            UPDATE users 
            SET is_activated = TRUE, activation_link = NULL 
            WHERE id = $1 
            RETURNING id, username, email, is_activated
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    // Обновление данных пользователя
    static async update(id, { username, email }) {
        const query = `
            UPDATE users 
            SET username = COALESCE($1, username),
                email = COALESCE($2, email),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3 
            RETURNING id, username, email, is_activated, created_at
        `;
        const values = [username, email, id];
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // Обновление пароля (принимает готовый хеш)
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

    // Удаление пользователя
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
}

module.exports = UserModel;