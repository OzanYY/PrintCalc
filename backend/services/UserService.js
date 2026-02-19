// services/UserService.js
const UserModel = require('../models/UserModel');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

class UserService {
    // Регистрация нового пользователя
    static async register(userData) {
        const { username, email, password } = userData;

        // 1. Валидация
        if (!username || !email || !password) {
            throw new Error('All fields are required');
        }

        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }

        // 2. Проверка на существование
        const existingEmail = await UserModel.findByEmail(email);
        if (existingEmail) {
            throw new Error('Email already exists');
        }

        const existingUsername = await UserModel.findByUsername(username);
        if (existingUsername) {
            throw new Error('Username already exists');
        }

        // 3. Хеширование пароля
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // 4. Генерация ссылки для активации
        const activation_link = crypto.randomBytes(32).toString('hex');

        // 5. Создание пользователя в БД
        try {
            const newUser = await UserModel.create({
                username,
                email,
                password_hash,
                activation_link
            });

            return {
                user: newUser,
                activation_link // вернем, чтобы потом отправить по email
            };
        } catch (error) {
            // Обработка ошибок БД
            if (error.code === '23505') { // unique violation
                if (error.constraint === 'users_email_key') {
                    throw new Error('Email already exists');
                }
                if (error.constraint === 'users_username_key') {
                    throw new Error('Username already exists');
                }
            }
            throw error;
        }
    }

    // Вход пользователя
    static async login(email, password) {
        // 1. Поиск пользователя
        const user = await UserModel.findByEmail(email);
        if (!user) {
            throw new Error('Invalid email or password');
        }

        // 2. Проверка пароля
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            throw new Error('Invalid email or password');
        }

        // Возвращаем пользователя без пароля
        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    // Активация аккаунта
    static async activateAccount(link) {
        // 1. Поиск по ссылке
        const user = await UserModel.findByActivationLink(link);
        if (!user) {
            throw new Error('Invalid or expired activation link');
        }

        // 2. Активация
        const activatedUser = await UserModel.activateUser(user.id);
        return activatedUser;
    }

    // Смена пароля
    static async changePassword(userId, oldPassword, newPassword) {
        // 1. Получаем пользователя
        const user = await UserModel.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Нам нужен полный user с паролем, поэтому делаем отдельный запрос
        const fullUser = await UserModel.findByEmail(user.email);

        // 2. Проверяем старый пароль
        const isValid = await bcrypt.compare(oldPassword, fullUser.password_hash);
        if (!isValid) {
            throw new Error('Current password is incorrect');
        }

        // 3. Валидация нового пароля
        if (newPassword.length < 6) {
            throw new Error('New password must be at least 6 characters');
        }

        // 4. Хешируем и сохраняем новый пароль
        const password_hash = await bcrypt.hash(newPassword, 10);
        await UserModel.updatePasswordHash(userId, password_hash);

        return { message: 'Password changed successfully' };
    }

    // Обновление профиля
    static async updateProfile(userId, updateData) {
        const { username, email } = updateData;

        // 1. Проверяем, не занят ли новый email
        if (email) {
            const existingUser = await UserModel.findByEmail(email);
            if (existingUser && existingUser.id !== userId) {
                throw new Error('Email already in use');
            }
        }

        // 2. Проверяем, не занят ли новый username
        if (username) {
            const existingUser = await UserModel.findByUsername(username);
            if (existingUser && existingUser.id !== userId) {
                throw new Error('Username already in use');
            }
        }

        // 3. Обновляем данные
        const updatedUser = await UserModel.update(userId, { username, email });
        return updatedUser;
    }

    // Запрос на сброс пароля
    static async requestPasswordReset(email) {
        const user = await UserModel.findByEmail(email);
        if (!user) {
            // Не говорим, что пользователь не найден (безопасность)
            return { message: 'If email exists, reset link will be sent' };
        }

        // Генерируем токен для сброса
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        // Здесь нужно сохранить токен в БД (добавить поле в таблицу)
        // await UserModel.saveResetToken(user.id, resetToken, expiry);
        
        return { resetToken };
    }

    // Получение профиля
    static async getProfile(userId) {
        const user = await UserModel.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }

    // Удаление аккаунта
    static async deleteAccount(userId, password) {
        // 1. Проверяем пароль
        const user = await UserModel.findByEmail((await UserModel.findById(userId)).email);
        const isValid = await bcrypt.compare(password, user.password_hash);
        
        if (!isValid) {
            throw new Error('Invalid password');
        }

        // 2. Удаляем пользователя
        await UserModel.delete(userId);
        return { message: 'Account deleted successfully' };
    }
}

module.exports = UserService;