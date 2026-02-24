// middleware/authMiddleware.js
const TokenService = require('../services/TokenService');

module.exports = async (req, res, next) => {
    try {
        if (!req.cookies?.accessToken) {
            return res.status(401).json({
                error: 'No token provided',
                code: 'NO_TOKEN'
            });
        }

        const token = req.cookies.accessToken;
        const userData = TokenService.validateAccessToken(token);


        if (!userData) {
            return res.status(401).json({
                error: 'Invalid or expired token',
                code: 'INVALID_TOKEN'
            });
        }

        req.user = userData;
        next();

    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
};