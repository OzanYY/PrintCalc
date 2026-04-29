// services/UserService.js
const UserModel = require('../models/UserModel');
const TokenService = require('./TokenService'); // нужен для resetPassword
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const MailService = require('./MailService');

class UserService {
    // ─── Регистрация ──────────────────────────────────────────────────────────
    static async register(userData) {
        const { username, email, password } = userData;

        if (!username || !email || !password) {
            throw new Error('All fields are required');
        }
        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }

        const existingEmail = await UserModel.findByEmail(email);
        if (existingEmail) throw new Error('Email already exists');

        const existingUsername = await UserModel.findByUsername(username);
        if (existingUsername) throw new Error('Username already exists');

        const password_hash    = await bcrypt.hash(password, 10);
        const activation_link  = crypto.randomBytes(32).toString('hex');

        try {
            const newUser = await UserModel.create({ username, email, password_hash, activation_link });

            // const activationUrl = `${process.env.API_URL}/api/activate/${activation_link}`;
            // await MailService.sendActivationMail(email, activationUrl);

            return { user: newUser, activation_link };
        } catch (error) {
            if (error.code === '23505') {
                if (error.constraint === 'users_email_key')    throw new Error('Email already exists');
                if (error.constraint === 'users_username_key') throw new Error('Username already exists');
            }
            throw error;
        }
    }

    // ─── Вход ────────────────────────────────────────────────────────────────
    static async login(email, password) {
        const user = await UserModel.findByEmail(email);
        if (!user) throw new Error('Invalid email or password');

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) throw new Error('Invalid email or password');

        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    // ─── Активация аккаунта ───────────────────────────────────────────────────
    static async activateAccount(link) {
        const user = await UserModel.findByActivationLink(link);
        if (!user) throw new Error('Invalid or expired activation link');
        if (user.is_activated) throw new Error('Account already activated');

        const activatedUser = await UserModel.activateUser(user.id);

        try {
            await MailService.sendWelcomeMail(user.email, user.username);
        } catch (error) {
            console.error('Failed to send welcome email:', error);
        }

        return activatedUser;
    }

    // ─── Смена пароля ─────────────────────────────────────────────────────────
    static async changePassword(userId, oldPassword, newPassword) {
        const user = await UserModel.findById(userId);
        if (!user) throw new Error('User not found');

        // findById не возвращает password_hash — делаем отдельный запрос
        const fullUser = await UserModel.findByEmail(user.email);

        const isValid = await bcrypt.compare(oldPassword, fullUser.password_hash);
        if (!isValid) throw new Error('Current password is incorrect');

        if (newPassword.length < 6) throw new Error('New password must be at least 6 characters');

        const password_hash = await bcrypt.hash(newPassword, 10);
        await UserModel.updatePasswordHash(userId, password_hash);

        return { message: 'Password changed successfully' };
    }

    // ─── Обновление профиля ───────────────────────────────────────────────────
    static async updateProfile(userId, updateData) {
        const { username, email } = updateData;

        if (email) {
            const existing = await UserModel.findByEmail(email);
            if (existing && existing.id !== userId) throw new Error('Email already in use');
        }

        if (username) {
            const existing = await UserModel.findByUsername(username);
            if (existing && existing.id !== userId) throw new Error('Username already in use');
        }

        return UserModel.update(userId, { username, email });
    }

    // ─── Запрос на сброс пароля ───────────────────────────────────────────────
    static async requestPasswordReset(email) {
        const user = await UserModel.findByEmail(email);

        // Всегда одинаковый ответ — не раскрываем наличие email
        if (!user) return { message: 'If email exists, reset link will be sent' };

        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt  = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        await UserModel.setResetToken(user.id, resetToken, expiresAt);

        try {
            await MailService.sendPasswordResetMail(email, resetToken);
        } catch (error) {
            console.error('Failed to send password reset email:', error);
            throw new Error('Failed to send reset email');
        }

        return { message: 'If email exists, reset link will be sent' };
    }

    // ─── Сброс пароля по токену ───────────────────────────────────────────────
    static async resetPassword(token, newPassword) {
        const user = await UserModel.findByResetToken(token);
        if (!user) throw new Error('Invalid or expired reset token');

        if (newPassword.length < 6) throw new Error('Password must be at least 6 characters');

        const password_hash = await bcrypt.hash(newPassword, 10);
        await UserModel.updatePasswordHash(user.id, password_hash);
        await UserModel.clearResetToken(user.id);

        // Исправлено: был прямой вызов TokenModel без импорта
        await TokenService.removeAllUserTokens(user.id);

        return { message: 'Password reset successfully' };
    }

    // ─── Получение профиля ────────────────────────────────────────────────────
    static async getProfile(userId) {
        const user = await UserModel.findById(userId);
        if (!user) throw new Error('User not found');
        return user;
    }

    // ─── Удаление аккаунта ────────────────────────────────────────────────────
    static async deleteAccount(userId, password) {
        const user     = await UserModel.findById(userId);
        const fullUser = await UserModel.findByEmail(user.email);

        const isValid = await bcrypt.compare(password, fullUser.password_hash);
        if (!isValid) throw new Error('Invalid password');

        await UserModel.delete(userId);
        return { message: 'Account deleted successfully' };
    }
}

module.exports = UserService;