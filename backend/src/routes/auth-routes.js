const express = require('express');
const router = express.Router();

const AuthController = require('../controllers/AuthController');
const authMiddleware = require('../middleware/auth-middleware');

// Публичные маршруты
router.use(authMiddleware.authMiddleware);
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);
router.get('/activate/:link', AuthController.activate);
router.post('/password-reset-request', AuthController.requestPasswordReset);
router.post('/reset-password', AuthController.resetPassword);
router.get('/status', (req, res) => {
  // Возвращаем статус и данные пользователя (если авторизован)
  res.json({
    isAuth: req.isAuth,
    user: req.user // Если null, значит не авторизован
  });
});

// Защищенные маршруты
router.use(authMiddleware.requireAuth);
router.get('/me', AuthController.getMe);
router.post('/logout', AuthController.logout);
router.post('/logout-all', AuthController.logoutAll);
router.post('/change-password', AuthController.changePassword);
router.get('/sessions', AuthController.getSessions);
router.post('/terminate-other-sessions', AuthController.terminateOtherSessions);
router.delete('/delete-account', AuthController.deleteAccount);
router.get('/verify', AuthController.verifyToken);

module.exports = router;