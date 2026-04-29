// services/TokenService.js
const jwt = require('jsonwebtoken');
const TokenModel = require('../models/TokenModel');

class TokenService {
    // ─── Генерация пары токенов ───────────────────────────────────────────────
    static generateTokens(payload) {
        const accessToken = jwt.sign(
            payload,
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
        );

        const refreshToken = jwt.sign(
            { id: payload.id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
        );

        return { accessToken, refreshToken };
    }

    // ─── Валидация токенов ────────────────────────────────────────────────────
    static validateAccessToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        } catch {
            return null;
        }
    }

    static validateRefreshToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        } catch {
            return null;
        }
    }

    // ─── Сохранение refresh токена ────────────────────────────────────────────
    static async saveToken(userId, refreshToken, metadata = {}) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Сначала чистим старые сессии, потом сохраняем новый токен
        await TokenModel.deleteOldTokens(userId, 5);
        return TokenModel.create(userId, refreshToken, expiresAt, metadata);
    }

    // ─── Удаление токенов ─────────────────────────────────────────────────────
    static async removeToken(refreshToken) {
        return TokenModel.deleteByToken(refreshToken);
    }

    static async removeAllUserTokens(userId) {
        return TokenModel.deleteAllByUserId(userId);
    }

    // Удалён дубликат terminateOtherSessions — используй этот метод
    static async removeOtherTokens(userId, currentRefreshToken) {
        return TokenModel.deleteAllExcept(userId, currentRefreshToken);
    }

    // ─── Поиск токена ─────────────────────────────────────────────────────────
    static async findToken(refreshToken) {
        return TokenModel.findValidToken(refreshToken);
    }

    // ─── Ротация токенов ──────────────────────────────────────────────────────
    static async refreshTokens(refreshToken) {
        // 1. Валидируем JWT подпись
        const userData = this.validateRefreshToken(refreshToken);
        console.log('[refresh] JWT valid:', !!userData);
        if (!userData) {
            throw new Error('Invalid refresh token');
        }

        // 2. Ищем токен в БД (findValidToken делает JOIN на users —
        //    email и username приходят оттуда, а не из JWT)
        const tokenFromDb = await TokenModel.findValidToken(refreshToken);
        console.log('[refresh] Found in DB:', !!tokenFromDb);
        console.log('[refresh] Token (first 20 chars):', refreshToken.slice(0, 20));

        // добавь сюда:
        console.log('[refresh] tokenFromDb fields:', {
            user_id: tokenFromDb.user_id,
            email: tokenFromDb.email,
            username: tokenFromDb.username,
            fingerprint: tokenFromDb.fingerprint,
            user_agent: tokenFromDb.user_agent,
            ip_address: tokenFromDb.ip_address,
        });
        if (!tokenFromDb) {
            throw new Error('Refresh token not found or expired');
        }

        // 3. Генерируем новые токены
        const payload = {
            id: tokenFromDb.user_id,
            email: tokenFromDb.email,
            username: tokenFromDb.username,
        };
        const tokens = this.generateTokens(payload);

        // 4. Атомарно заменяем старый токен новым (транзакция в replaceToken)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await TokenModel.replaceToken(
            refreshToken,
            tokens.refreshToken,
            tokenFromDb.user_id,
            expiresAt,
            {
                fingerprint: tokenFromDb.fingerprint,
                userAgent: tokenFromDb.user_agent,
                ipAddress: tokenFromDb.ip_address,
            }
        );

        return {
            ...tokens,
            user: {
                id: tokenFromDb.user_id,
                email: tokenFromDb.email,
                username: tokenFromDb.username,
            },
        };
    }

    // ─── Создание токенов после аутентификации ────────────────────────────────
    static async createAuthTokens(user, metadata = {}) {
        const payload = {
            id: user.id,
            email: user.email,
            username: user.username,
        };

        const tokens = this.generateTokens(payload);
        await this.saveToken(user.id, tokens.refreshToken, metadata);
        return tokens;
    }

    // ─── Сессии пользователя ──────────────────────────────────────────────────
    static async getUserSessions(userId) {
        const tokens = await TokenModel.findValidByUserId(userId);
        return tokens.map(token => ({
            id: token.id,
            device: token.fingerprint || 'Unknown device',
            browser: this.parseUserAgent(token.user_agent),
            ip: token.ip_address,
            createdAt: token.created_at,
            expiresAt: token.expires_at,
            isCurrent: false,
        }));
    }

    static parseUserAgent(userAgent) {
        if (!userAgent) return 'Unknown';
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        return 'Other';
    }

    // ─── Служебные ───────────────────────────────────────────────────────────
    static async cleanupExpiredTokens() {
        const deletedCount = await TokenModel.deleteExpired();
        console.log(`Cleaned up ${deletedCount} expired tokens`);
        return deletedCount;
    }

    static async getUserTokenStats(userId) {
        return TokenModel.getUserStats(userId);
    }
}

module.exports = TokenService;