// models/User.js
const pool = require('../database');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

class User {
    constructor(data = {}) {
        this.id = data.id;
        this.email = data.email;
        this.password = data.password;
        this.isActivated = data.is_activated || false;
        this.activationLink = data.activation_link;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
    }

    // Аналог UserSchema в Mongoose
    static async create(userData) {
        const { email, password } = userData;
        
        // Хеширование пароля (как в Mongoose pre-save hook)
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Генерация ссылки активации
        const activationLink = crypto.randomBytes(32).toString('hex');

        const query = `
            INSERT INTO users (email, password, activation_link)
            VALUES ($1, $2, $3)
            RETURNING id, email, is_activated, activation_link, created_at
        `;

        const values = [email.toLowerCase(), hashedPassword, activationLink];

        try {
            const result = await pool.query(query, values);
            return new User(result.rows[0]);
        } catch (error) {
            if (error.code === '23505') { // unique_violation
                throw new Error('User with this email already exists');
            }
            throw error;
        }
    }

    // Аналог findOne({ email })
    static async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await pool.query(query, [email.toLowerCase()]);
        return result.rows[0] ? new User(result.rows[0]) : null;
    }

    // Аналог findById
    static async findById(id) {
        const query = 'SELECT * FROM users WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0] ? new User(result.rows[0]) : null;
    }

    // Аналог findOne({ activationLink })
    static async findByActivationLink(link) {
        const query = 'SELECT * FROM users WHERE activation_link = $1';
        const result = await pool.query(query, [link]);
        return result.rows[0] ? new User(result.rows[0]) : null;
    }

    // Аналог сохранения с обновлением
    async save() {
        // Для обновления существующего пользователя
        const query = `
            UPDATE users 
            SET email = $1, 
                password = $2, 
                is_activated = $3, 
                activation_link = $4,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
            RETURNING *
        `;
        
        const values = [
            this.email,
            this.password,
            this.isActivated,
            this.activationLink,
            this.id
        ];

        const result = await pool.query(query, values);
        Object.assign(this, new User(result.rows[0]));
        return this;
    }

    // Специфичный метод для активации
    async activate() {
        const query = `
            UPDATE users 
            SET is_activated = true, activation_link = NULL
            WHERE id = $1
            RETURNING *
        `;
        const result = await pool.query(query, [this.id]);
        Object.assign(this, new User(result.rows[0]));
        return this;
    }

    // Метод для сравнения пароля
    async comparePassword(candidatePassword) {
        return bcrypt.compare(candidatePassword, this.password);
    }

    // Метод для преобразования в JSON (исключаем пароль)
    toJSON() {
        return {
            id: this.id,
            email: this.email,
            isActivated: this.isActivated,
            activationLink: this.activationLink,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = User;