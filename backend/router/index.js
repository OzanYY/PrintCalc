const express = require('express');
const router = express.Router();

const userController = require("../controllers/user-controller")
const AuthController = require('../controllers/AuthController');
const authMiddleware = require('../middleware/authMiddleware');

// Публичные маршруты (не требуют авторизации)
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);
router.get('/activate/:link', AuthController.activate);
router.post('/password-reset-request', AuthController.requestPasswordReset);
router.get("/users", userController.getUsers);

// Защищенные маршруты (требуют авторизацию)
router.use(authMiddleware); // все маршруты ниже требуют токен

router.get('/me', AuthController.getMe);
router.post('/logout', AuthController.logout);
router.post('/logout-all', AuthController.logoutAll);
router.post('/change-password', AuthController.changePassword);
router.get('/sessions', AuthController.getSessions);
router.post('/terminate-other-sessions', AuthController.terminateOtherSessions);
router.delete('/delete-account', AuthController.deleteAccount);
router.get('/verify', AuthController.verifyToken);

module.exports = router;

