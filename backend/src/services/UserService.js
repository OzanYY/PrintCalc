// services/UserService.js
const UserModel = require('../models/UserModel');
const TokenService = require('./TokenService'); // нужен для resetPassword
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const MailService = require('./MailService');
const path = require('path');
const fs = require('fs');

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

            const activationUrl = `${process.env.API_URL}/api/auth/activate/${activation_link}`;
            try {
                await MailService.sendActivationMail(email, activationUrl);
            } catch (mailError) {
                console.error('Failed to send activation email:', mailError);
            }

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

    // ─── Повторная отправка письма активации ─────────────────────────────────
    static async resendActivation(userId) {
        const user = await UserModel.findByIdWithHash(userId);
        if (!user) throw new Error('User not found');
        if (user.is_activated) throw new Error('Account already activated');

        let { activation_link } = user;
        if (!activation_link) {
            activation_link = crypto.randomBytes(32).toString('hex');
            await UserModel.setActivationLink(userId, activation_link);
        }

        const activationUrl = `${process.env.API_URL}/api/auth/activate/${activation_link}`;
        await MailService.sendActivationMail(user.email, activationUrl);
        return { message: 'Activation email sent' };
    }

    // ─── Смена пароля ─────────────────────────────────────────────────────────
    static async changePassword(userId, oldPassword, newPassword, currentRefreshToken = null) {
        // findByIdWithHash возвращает запись включая password_hash — один запрос вместо двух
        const fullUser = await UserModel.findByIdWithHash(userId);
        if (!fullUser) throw new Error('User not found');

        const isValid = await bcrypt.compare(oldPassword, fullUser.password_hash);
        if (!isValid) throw new Error('Пароль неверный');

        if (newPassword.length < 6) throw new Error('Новый пароль должен быть длинее 6 символов');

        const password_hash = await bcrypt.hash(newPassword, 10);
        await UserModel.updatePasswordHash(userId, password_hash);

        // Разлогиниваем все остальные сессии, кроме текущей
        if (currentRefreshToken) {
            await TokenService.removeOtherTokens(userId, currentRefreshToken);
        } else {
            // Если текущий refresh-токен недоступен — выкидываем все сессии
            await TokenService.removeAllUserTokens(userId);
        }

        return { message: 'Пароль успешно изменен' };
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

    // ─── Запрос на смену email ────────────────────────────────────────────────
    static async requestEmailChange(userId, newEmail, password) {
        const user = await UserModel.findByIdWithHash(userId);
        if (!user) throw new Error('User not found');

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) throw new Error('Неверный пароль');

        if (newEmail.toLowerCase() === user.email.toLowerCase()) {
            throw new Error('Новый email совпадает с текущим');
        }

        const existing = await UserModel.findByEmail(newEmail);
        if (existing) throw new Error('Email уже используется');

        const token = crypto.randomBytes(32).toString('hex');
        await UserModel.setPendingEmail(userId, newEmail, token);

        const confirmUrl = `${process.env.API_URL}/api/auth/confirm-email-change/${token}`;
        await MailService.sendEmailChangeMail(newEmail, confirmUrl, user.username);

        return { message: 'Письмо с подтверждением отправлено на новый email' };
    }

    // ─── Подтверждение смены email ────────────────────────────────────────────
    static async confirmEmailChange(token) {
        const user = await UserModel.findByEmailChangeToken(token);
        if (!user) throw new Error('Недействительная или устаревшая ссылка подтверждения');

        const updated = await UserModel.confirmEmailChange(user.id);
        return updated;
    }

    // ─── Отмена смены email ───────────────────────────────────────────────────
    static async cancelEmailChange(userId) {
        await UserModel.cancelEmailChange(userId);
        return { message: 'Смена email отменена' };
    }

    // ─── Удаление аккаунта ────────────────────────────────────────────────────
    static async deleteAccount(userId, password) {
        const user     = await UserModel.findById(userId);
        const fullUser = await UserModel.findByEmail(user.email);

        const isValid = await bcrypt.compare(password, fullUser.password_hash);
        if (!isValid) throw new Error('Invalid password');

        if (user.avatar) {
            try {
                const filename  = path.basename(user.avatar);
                const avatarDir = path.join(__dirname, '../../uploads/avatars');
                const filepath  = path.join(avatarDir, filename);
                if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
            } catch (err) {
                console.error('Failed to delete avatar on account deletion:', err);
            }
        }

        await UserModel.delete(userId);
        return { message: 'Account deleted successfully' };
    }
}

module.exports = UserService;