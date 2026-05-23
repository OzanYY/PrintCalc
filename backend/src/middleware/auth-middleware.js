// middleware/authMiddleware.js
const TokenService = require('../services/TokenService');
const TokenModel = require('../models/TokenModel');
const UserModel = require('../models/UserModel');

async function authMiddleware(req, res, next) {
    const token = req.cookies.accessToken;

    req.isAuth = false;
    req.user = null;

    if (!token) {
        return next();
    }

    try {
        const userData = TokenService.validateAccessToken(token);
        if (!userData) {
            return next();
        }

        // Проверяем jti в denylist — сюда попадают завершённые сессии.
        // Если токен отозван — считаем запрос неаутентифицированным,
        // чтобы интерцептор на фронте попытался сделать refresh,
        // который завершится с 401 (refresh тоже удалён из БД).
        if (userData.jti) {
            const revoked = await TokenModel.isInDenylist(userData.jti);
            if (revoked) {
                return next();
            }
        }

        req.isAuth = true;
        req.user = userData;
        return next();
    }
    catch (error) {
        console.log('Error auth:', error);
        return next();
    }
}

async function requireAuth(req, res, next) {
    if (!req.isAuth) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required'
        });
    }
    next();
}

async function requireActivated(req, res, next) {
    try {
        const user = await UserModel.findById(req.user.id);
        if (!user || !user.is_activated) {
            return res.status(403).json({
                error: 'Account not activated',
                message: 'Пожалуйста, активируйте аккаунт по ссылке из письма. Неактивированные аккаунты автоматически удаляются через 2 недели после регистрации.',
                code: 'ACCOUNT_NOT_ACTIVATED',
            });
        }
        next();
    } catch (error) {
        console.error('requireActivated error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = { authMiddleware, requireAuth, requireActivated }