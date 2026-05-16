// services/TokenService.js
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const TokenModel = require('../models/TokenModel');
const pool = require('../config/database');

class TokenService {
    // ─── Генерация пары токенов ───────────────────────────────────────────────
    static generateTokens(payload) {
        const jti = uuidv4(); // уникальный id access токена — нужен для denylist

        const accessToken = jwt.sign(
            { ...payload, jti },
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

        await TokenModel.deleteOldTokens(userId, 5);
        return TokenModel.create(userId, refreshToken, expiresAt, metadata);
    }

    // ─── Сохранение jti последнего выданного access токена ───────────────────
    // Вызывается после каждой выдачи/обновления токенов.
    // Позволяет при удалении сессии знать какой jti заблокировать.
    static async updateLastAccessJti(refreshToken, jti, accessExpiresAt) {
        const query = `
            UPDATE tokens
            SET last_access_jti = $1, last_access_expires_at = $2
            WHERE refresh_token = $3
        `;
        await pool.query(query, [jti, accessExpiresAt, refreshToken]);
    }

    // ─── Удаление токенов ─────────────────────────────────────────────────────
    static async removeToken(refreshToken) {
        return TokenModel.deleteByToken(refreshToken);
    }

    static async removeAllUserTokens(userId) {
        // Блокируем все живые access токены пользователя, потом удаляем refresh
        await this.#denyAllUserAccessTokens(userId);
        return TokenModel.deleteAllByUserId(userId);
    }

    static async removeOtherTokens(userId, currentRefreshToken) {
        // Блокируем access токены всех сессий кроме текущей
        await this.#denyAllUserAccessTokens(userId, currentRefreshToken);
        return TokenModel.deleteAllExcept(userId, currentRefreshToken);
    }

    // ─── Удаление одной сессии по id ─────────────────────────────────────────
    static async removeTokenById(tokenId, userId) {
        // Получаем jti последнего access токена этой сессии
        const selectQuery = `
            SELECT last_access_jti, last_access_expires_at
            FROM tokens
            WHERE id = $1 AND user_id = $2
        `;
        const selectResult = await pool.query(selectQuery, [tokenId, userId]);
        const row = selectResult.rows[0];

        if (!row) return null; // сессия не найдена или чужая

        // Блокируем access токен если он ещё живой
        if (row.last_access_jti && new Date(row.last_access_expires_at) > new Date()) {
            await TokenModel.addToDenylist(row.last_access_jti, row.last_access_expires_at);
        }

        // Удаляем refresh токен из БД
        const deleteQuery = `
            DELETE FROM tokens
            WHERE id = $1 AND user_id = $2
            RETURNING id
        `;
        const deleteResult = await pool.query(deleteQuery, [tokenId, userId]);
        return deleteResult.rows[0] ?? null;
    }

    // ─── Приватный: блокировка всех access токенов пользователя ──────────────
    // exceptRefreshToken — refresh токен текущей сессии, которую не трогаем
    static async #denyAllUserAccessTokens(userId, exceptRefreshToken = null) {
        const query = exceptRefreshToken
            ? `SELECT last_access_jti, last_access_expires_at
               FROM tokens
               WHERE user_id = $1
                 AND refresh_token != $2
                 AND last_access_jti IS NOT NULL
                 AND last_access_expires_at > NOW()`
            : `SELECT last_access_jti, last_access_expires_at
               FROM tokens
               WHERE user_id = $1
                 AND last_access_jti IS NOT NULL
                 AND last_access_expires_at > NOW()`;

        const params = exceptRefreshToken ? [userId, exceptRefreshToken] : [userId];
        const result = await pool.query(query, params);

        // INSERT всех jti одним запросом вместо N отдельных
        if (result.rows.length > 0) {
            const values = result.rows
                .map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`)
                .join(', ');
            const flat = result.rows.flatMap(r => [r.last_access_jti, r.last_access_expires_at]);
            await pool.query(
                `INSERT INTO token_denylist (jti, expires_at) VALUES ${values}
                 ON CONFLICT (jti) DO NOTHING`,
                flat
            );
        }
    }

    // ─── Поиск токена ─────────────────────────────────────────────────────────
    static async findToken(refreshToken) {
        return TokenModel.findValidToken(refreshToken);
    }

    // ─── Ротация токенов ──────────────────────────────────────────────────────
    static async refreshTokens(refreshToken) {
        // 1. Валидируем JWT подпись
        const userData = this.validateRefreshToken(refreshToken);
        if (!userData) throw new Error('Invalid refresh token');

        // 2. Ищем токен в БД (findValidToken делает JOIN на users)
        const tokenFromDb = await TokenModel.findValidToken(refreshToken);
        if (!tokenFromDb) throw new Error('Refresh token not found or expired');

        // 3. Генерируем новые токены
        const payload = {
            id: tokenFromDb.user_id,
            email: tokenFromDb.email,
            username: tokenFromDb.username,
        };
        const tokens = this.generateTokens(payload);

        // 4. Атомарно заменяем старый токен новым
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

        // 5. Сохраняем jti нового access токена
        const decoded = jwt.decode(tokens.accessToken);
        await this.updateLastAccessJti(
            tokens.refreshToken,
            decoded.jti,
            new Date(decoded.exp * 1000)
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

        // Сохраняем jti access токена рядом с refresh токеном
        const decoded = jwt.decode(tokens.accessToken);
        await this.updateLastAccessJti(
            tokens.refreshToken,
            decoded.jti,
            new Date(decoded.exp * 1000)
        );

        return tokens;
    }

    // ─── Сессии пользователя ──────────────────────────────────────────────────
    static async getUserSessions(userId, currentRefreshToken = null) {
        const tokens = await TokenModel.findValidByUserId(userId);

        // Если передан текущий refresh-токен — ищем совпадение по полю
        // findValidByUserId не возвращает сам refresh_token (только метаданные),
        // поэтому делаем отдельный запрос чтобы получить id текущей сессии.
        let currentTokenId = null;
        if (currentRefreshToken) {
            const currentToken = await TokenModel.findValidToken(currentRefreshToken);
            if (currentToken) currentTokenId = String(currentToken.id);
        }

        return tokens.map(token => ({
            id: token.id,
            user_agent: token.user_agent,
            ip_address: token.ip_address,
            created_at: token.created_at,
            // last_access_expires_at — время истечения последнего access-токена.
            // Фронт вычтет ACCESS_TOKEN_TTL чтобы получить время последней активности.
            last_used_at: token.last_access_expires_at ?? null,
            is_current: currentTokenId !== null && String(token.id) === currentTokenId,
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
        const deletedTokens = await TokenModel.deleteExpired();
        const deletedDenylist = await TokenModel.cleanupDenylist();
        console.log(`Cleaned up ${deletedTokens} expired tokens, ${deletedDenylist} denylist entries`);
        return { deletedTokens, deletedDenylist };
    }

    static async getUserTokenStats(userId) {
        return TokenModel.getUserStats(userId);
    }
}

module.exports = TokenService;