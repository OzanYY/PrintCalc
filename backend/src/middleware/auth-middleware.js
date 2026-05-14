// middleware/authMiddleware.js
const TokenService = require('../services/TokenService');
const TokenModel = require('../models/TokenModel');

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

module.exports = { authMiddleware, requireAuth }