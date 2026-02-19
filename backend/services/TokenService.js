// services/TokenService.js
const jwt = require('jsonwebtoken');
const TokenModel = require('../models/TokenModel');

class TokenService {
    // Генерация пары токенов
    static generateTokens(payload) {
        const accessToken = jwt.sign(
            payload,
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
        );

        const refreshToken = jwt.sign(
            { id: payload.id }, // только ID для refresh токена
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
        );

        return { accessToken, refreshToken };
    }

    // Валидация access токена
    static validateAccessToken(token) {
        try {
            const userData = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            return userData;
        } catch (error) {
            return null;
        }
    }

    // Валидация refresh токена
    static validateRefreshToken(token) {
        try {
            const userData = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
            return userData;
        } catch (error) {
            return null;
        }
    }

    // Сохранение refresh токена в БД
    static async saveToken(userId, refreshToken, metadata = {}) {
        // Срок действия из JWT или 7 дней по умолчанию
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Ограничиваем количество сессий (опционально)
        await TokenModel.deleteOldTokens(userId, 5); // максимум 5 активных сессий

        return TokenModel.create(userId, refreshToken, expiresAt, metadata);
    }

    // Удаление токена (выход)
    static async removeToken(refreshToken) {
        return TokenModel.deleteByToken(refreshToken);
    }

    // Удаление всех токенов пользователя (выход со всех устройств)
    static async removeAllUserTokens(userId) {
        return TokenModel.deleteAllByUserId(userId);
    }

    // Удаление всех токенов кроме текущего
    static async removeOtherTokens(userId, currentRefreshToken) {
        return TokenModel.deleteAllExcept(userId, currentRefreshToken);
    }

    // Поиск токена в БД
    static async findToken(refreshToken) {
        return TokenModel.findValidToken(refreshToken);
    }

    // Обновление токенов (ротация)
    static async refreshTokens(refreshToken) {
        // 1. Валидируем refresh токен
        const userData = this.validateRefreshToken(refreshToken);
        if (!userData) {
            throw new Error('Invalid refresh token');
        }

        // 2. Ищем токен в БД
        const tokenFromDb = await TokenModel.findValidToken(refreshToken);
        if (!tokenFromDb) {
            throw new Error('Refresh token not found or expired');
        }

        // 3. Генерируем новые токены
        const payload = {
            id: tokenFromDb.user_id,
            email: tokenFromDb.email,
            username: tokenFromDb.username
        };
        
        const tokens = this.generateTokens(payload);

        // 4. Сохраняем новый refresh токен (ротация)
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
                ipAddress: tokenFromDb.ip_address
            }
        );

        return {
            ...tokens,
            user: {
                id: tokenFromDb.user_id,
                email: tokenFromDb.email,
                username: tokenFromDb.username
            }
        };
    }

    // Получение всех активных сессий пользователя
    static async getUserSessions(userId) {
        const tokens = await TokenModel.findValidByUserId(userId);
        
        // Форматируем для клиента (без токенов)
        return tokens.map(token => ({
            id: token.id,
            device: token.fingerprint || 'Unknown device',
            browser: this.parseUserAgent(token.user_agent),
            ip: token.ip_address,
            createdAt: token.created_at,
            expiresAt: token.expires_at,
            isCurrent: false // нужно будет пометить текущую сессию отдельно
        }));
    }

    // Парсинг user-agent (упрощенно)
    static parseUserAgent(userAgent) {
        if (!userAgent) return 'Unknown';
        
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        
        return 'Other';
    }

    // Создание токенов после успешной аутентификации
    static async createAuthTokens(user, metadata = {}) {
        // 1. Генерируем токены
        const payload = {
            id: user.id,
            email: user.email,
            username: user.username,
            isActivated: user.is_activated
        };
        
        const tokens = this.generateTokens(payload);

        // 2. Сохраняем refresh токен
        await this.saveToken(user.id, tokens.refreshToken, metadata);

        return tokens;
    }

    // Очистка просроченных токенов (можно вызывать по расписанию)
    static async cleanupExpiredTokens() {
        const deletedCount = await TokenModel.deleteExpired();
        console.log(`Cleaned up ${deletedCount} expired tokens`);
        return deletedCount;
    }

    // Получение статистики по токенам пользователя
    static async getUserTokenStats(userId) {
        return TokenModel.getUserStats(userId);
    }

    // Проверка, является ли токен текущим для пользователя
    static async isCurrentToken(userId, refreshToken) {
        const tokens = await TokenModel.findValidByUserId(userId);
        return tokens.some(t => t.refresh_token === refreshToken);
    }

    // Принудительное завершение всех сессий кроме текущей
    static async terminateOtherSessions(userId, currentRefreshToken) {
        return TokenModel.deleteAllExcept(userId, currentRefreshToken);
    }
}

module.exports = TokenService;