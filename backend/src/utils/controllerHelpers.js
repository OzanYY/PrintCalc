function getUserId(req) {
    return req.user?.id ?? req.user?.userId ?? req.user?._id ?? null;
}

function requireAuth(req, res) {
    if (!req.isAuth || !req.user) {
        res.status(401).json({ success: false, message: 'Необходима авторизация' });
        return null;
    }
    const userId = getUserId(req);
    if (!userId) {
        res.status(400).json({ success: false, message: 'ID пользователя не найден в токене' });
        return null;
    }
    return userId;
}

function errorStatus(message, fallback = 400) {
    if (message && (message.includes('не найден') || message.includes('not found'))) return 404;
    if (message && (message.includes('авторизация') || message.includes('Unauthorized'))) return 401;
    return fallback;
}

function sendError(res, error, fallback = 400) {
    res.status(errorStatus(error.message, fallback)).json({
        success: false,
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
}

module.exports = { getUserId, requireAuth, sendError };
