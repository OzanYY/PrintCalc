const express = require('express');
const router = express.Router();

const AuthController = require('../controllers/AuthController');
const authMiddleware = require('../middleware/auth-middleware');
const TokenService = require('../services/TokenService');
const UserService    = require('../services/UserService');

// Публичные маршруты
router.use(authMiddleware.authMiddleware);
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);
router.get('/activate/:link', AuthController.activate);
router.post('/password-reset-request', AuthController.requestPasswordReset);
router.post('/reset-password', AuthController.resetPassword);
router.get('/status', AuthController.status);

// Защищенные маршруты
router.use(authMiddleware.requireAuth);
router.post('/resend-activation', AuthController.resendActivation);
router.get('/me', AuthController.getMe);
router.post('/logout', AuthController.logout);
router.post('/logout-all', AuthController.logoutAll);
router.post('/change-password', AuthController.changePassword);
router.get('/sessions', AuthController.getSessions);
router.post('/terminate-other-sessions', AuthController.terminateOtherSessions);
router.delete('/delete-account', AuthController.deleteAccount);
router.get('/verify', AuthController.verifyToken);
router.delete('/sessions/:id', AuthController.terminateSession);
router.put('/me', async (req, res) => {
    try {
        const updated = await UserService.updateProfile(req.user.id, req.body);
        res.json({ user: updated });
    } catch (error) {
        if (error.message.includes('already in use')) {
            return res.status(409).json({ error: error.message });
        }
        res.status(400).json({ error: error.message });
    }
});
 

module.exports = router;