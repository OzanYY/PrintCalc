// controllers/AuthController.js
const UserService  = require('../services/UserService');
const TokenService = require('../services/TokenService');
const TokenModel   = require('../models/TokenModel');

class AuthController {
    static ACCESS_MAX_AGE  = 15 * 60 * 1000;
    static REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

    // ─── Вспомогательный метод установки кук ─────────────────────────────────
    static #setCookies(res, accessToken, refreshToken) {
        const base = {
            httpOnly: true,
            secure:   process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        };
        res.cookie('accessToken',  accessToken,  { ...base, maxAge: AuthController.ACCESS_MAX_AGE });
        res.cookie('refreshToken', refreshToken, { ...base, maxAge: AuthController.REFRESH_MAX_AGE });
    }

    static #clearCookies(res) {
        const base = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' };
        res.clearCookie('accessToken',  base);
        res.clearCookie('refreshToken', base);
    }

    // ==================== РЕГИСТРАЦИЯ ====================
    static async register(req, res) {
        try {
            const { username, email, password } = req.body;
            if (!username || !email || !password) {
                return res.status(400).json({ error: 'Username, email and password are required' });
            }

            const result = await UserService.register({ username, email, password });
            const metadata = {
                fingerprint: req.headers['x-fingerprint'],
                userAgent:   req.headers['user-agent'],
                ipAddress:   req.ip,
            };
            const tokens = await TokenService.createAuthTokens(result.user, metadata);
            AuthController.#setCookies(res, tokens.accessToken, tokens.refreshToken);

            res.status(201).json({ message: 'User registered successfully', user: result.user });
        } catch (error) {
            console.error('Register error:', error);
            if (error.message.includes('already exists')) {
                return res.status(409).json({ error: error.message });
            }
            res.status(400).json({ error: error.message });
        }
    }

    // ==================== ВХОД ====================
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required' });
            }

            const user = await UserService.login(email, password);
            const metadata = {
                fingerprint: req.headers['x-fingerprint'],
                userAgent:   req.headers['user-agent'],
                ipAddress:   req.ip,
            };
            const tokens = await TokenService.createAuthTokens(user, metadata);
            AuthController.#setCookies(res, tokens.accessToken, tokens.refreshToken);

            res.json({ success: true, message: 'Login successful', user });
        } catch (error) {
            console.error('Login error:', error);
            res.status(401).json({ error: 'Invalid email or password' });
        }
    }

    // ==================== ВЫХОД ====================
    static async logout(req, res) {
        try {
            const refreshToken = req.cookies.refreshToken;
            if (!refreshToken) {
                return res.status(400).json({ error: 'Refresh token required' });
            }
            await TokenService.removeToken(refreshToken);
            AuthController.#clearCookies(res);
            res.json({ message: 'Logged out successfully' });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({ error: 'Logout failed' });
        }
    }

    // ==================== ВЫХОД СО ВСЕХ УСТРОЙСТВ ====================
    static async logoutAll(req, res) {
        try {
            const deletedCount = await TokenService.removeAllUserTokens(req.user.id);
            AuthController.#clearCookies(res);
            res.json({ message: `Logged out from ${deletedCount} devices` });
        } catch (error) {
            console.error('Logout all error:', error);
            res.status(500).json({ error: 'Logout failed' });
        }
    }

    // ==================== ОБНОВЛЕНИЕ ТОКЕНОВ ====================
    static async refresh(req, res) {
        try {
            const refreshToken = req.cookies.refreshToken;
            if (!refreshToken) {
                return res.status(400).json({ error: 'Refresh token required' });
            }

            const result = await TokenService.refreshTokens(refreshToken);
            AuthController.#setCookies(res, result.accessToken, result.refreshToken);
            res.json({ message: 'Tokens refreshed successfully', user: result.user });
        } catch (error) {
            console.error('Refresh error:', error);
            // Токен невалиден или не найден — чистим куки
            AuthController.#clearCookies(res);
            res.status(401).json({ error: 'Invalid refresh token' });
        }
    }

    // ==================== СТАТУС ====================
    // Больше НЕ делает рефреш сам.
    // Возвращает isAuth: true/false и hasRefreshToken: true/false.
    // Если accessToken истёк но refreshToken есть в куке —
    // фронт сам вызовет /auth/refresh, получит новые токены,
    // а потом повторит /auth/status через authRefreshBridge.
    static async status(req, res) {
        // accessToken валиден
        if (req.isAuth) {
            console.log("access валиден")
            return res.json({ isAuth: true, user: req.user, hasRefreshToken: false });
        }
        console.log("access не валиден")

        // accessToken невалиден — проверяем есть ли refreshToken в куке
        // Намеренно НЕ делаем refreshTokens здесь, чтобы избежать гонки с интерцептором
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            console.log("refresh не найден")
            return res.json({ isAuth: false, user: null, hasRefreshToken: false });
        }
        console.log("refresh найден")

        // Проверяем что JWT подпись валидна (без запроса в БД)
        const jwtPayload = TokenService.validateRefreshToken(refreshToken);
        if (!jwtPayload) {
            console.log("refresh просрочен или подделан")
            // JWT просрочен или подделан — чистим куку
            AuthController.#clearCookies(res);
            return res.json({ isAuth: false, user: null, hasRefreshToken: false });
        }
        console.log("refresh найден, нужен рефреш")

        // JWT валиден — сигнализируем фронту что нужен рефреш
        return res.json({ isAuth: false, user: null, hasRefreshToken: true });
    }

    // ==================== ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ ====================
    static async getMe(req, res) {
        try {
            const user = await UserService.getProfile(req.user.id);
            res.json({ user });
        } catch (error) {
            console.error('Get me error:', error);
            res.status(404).json({ error: 'User not found' });
        }
    }

    // ==================== АКТИВАЦИЯ ====================
    static async activate(req, res) {
        try {
            const { link } = req.params;
            if (!link) return res.status(400).json({ error: 'Activation link required' });
            const user = await UserService.activateAccount(link);
            res.json({ message: 'Account activated successfully', user });
        } catch (error) {
            console.error('Activation error:', error);
            res.status(400).json({ error: error.message });
        }
    }

    // ==================== СМЕНА ПАРОЛЯ ====================
    static async changePassword(req, res) {
        try {
            const { oldPassword, newPassword } = req.body;
            if (!oldPassword || !newPassword) {
                return res.status(400).json({ error: 'Old password and new password are required' });
            }
            const result = await UserService.changePassword(req.user.id, oldPassword, newPassword);
            res.json(result);
        } catch (error) {
            console.error('Change password error:', error);
            if (error.message.includes('incorrect')) {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Password change failed' });
        }
    }

    // ==================== СБРОС ПАРОЛЯ ====================
    static async requestPasswordReset(req, res) {
        try {
            const { email } = req.body;
            if (!email) return res.status(400).json({ error: 'Email is required' });
            const result = await UserService.requestPasswordReset(email);
            res.json(result);
        } catch (error) {
            console.error('Password reset request error:', error);
            res.status(500).json({ error: 'Failed to process request' });
        }
    }

    static async resetPassword(req, res) {
        try {
            const { token, newPassword } = req.body;
            if (!token || !newPassword) {
                return res.status(400).json({ error: 'Token and new password are required' });
            }
            const result = await UserService.resetPassword(token, newPassword);
            res.json(result);
        } catch (error) {
            console.error('Reset password error:', error);
            if (error.message.includes('Invalid or expired')) {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to reset password' });
        }
    }

    // ==================== СЕССИИ ====================
    static async getSessions(req, res) {
        try {
            const sessions = await TokenService.getUserSessions(req.user.id);
            res.json({ sessions, total: sessions.length });
        } catch (error) {
            console.error('Get sessions error:', error);
            res.status(500).json({ error: 'Failed to get sessions' });
        }
    }

    static async terminateOtherSessions(req, res) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                return res.status(400).json({ error: 'Current refresh token required' });
            }
            const deletedCount = await TokenService.removeOtherTokens(req.user.id, refreshToken);
            res.json({ message: `Terminated ${deletedCount} other sessions` });
        } catch (error) {
            console.error('Terminate sessions error:', error);
            res.status(500).json({ error: 'Failed to terminate sessions' });
        }
    }

    // ==================== УДАЛЕНИЕ АККАУНТА ====================
    static async deleteAccount(req, res) {
        try {
            const { password } = req.body;
            if (!password) return res.status(400).json({ error: 'Password is required' });

            await TokenService.removeAllUserTokens(req.user.id);
            await UserService.deleteAccount(req.user.id, password);
            AuthController.#clearCookies(res);
            res.json({ message: 'Account deleted successfully' });
        } catch (error) {
            console.error('Delete account error:', error);
            if (error.message.includes('Invalid password')) {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to delete account' });
        }
    }

    // ==================== ПРОВЕРКА ТОКЕНА ====================
    static async verifyToken(req, res) {
        res.json({ valid: true, user: req.user });
    }
}

module.exports = AuthController;