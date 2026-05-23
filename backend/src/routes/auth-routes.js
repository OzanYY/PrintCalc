const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const AuthController = require('../controllers/AuthController');
const authMiddleware = require('../middleware/auth-middleware');
const TokenService = require('../services/TokenService');
const UserService = require('../services/UserService');
const UserModel = require('../models/UserModel');

const avatarDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

const avatarUpload = multer({
    storage: multer.diskStorage({
        destination: avatarDir,
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`);
        },
    }),
    limits: { fileSize: 3 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype));
    },
});

// Публичные маршруты
router.use(authMiddleware.authMiddleware);
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);
router.get('/activate/:link', AuthController.activate);
router.get('/confirm-email-change/:token', AuthController.confirmEmailChange);
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
router.post('/request-email-change', AuthController.requestEmailChange);
router.delete('/request-email-change', AuthController.cancelEmailChange);
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

router.post('/avatar', avatarUpload.single('avatar'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded or invalid file type' });
    }
    try {
        const current = await UserModel.findById(req.user.id);
        if (current?.avatar) {
            try {
                const oldFile = path.join(avatarDir, path.basename(current.avatar));
                if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
            } catch { /* ignore */ }
        }

        const baseUrl = process.env.API_URL || 'http://localhost:5000';
        const avatarUrl = `${baseUrl}/uploads/avatars/${req.file.filename}`;
        const updated = await UserModel.updateAvatar(req.user.id, avatarUrl);
        res.json({ user: updated });
    } catch (error) {
        console.error('Upload avatar error:', error);
        res.status(500).json({ error: 'Failed to upload avatar' });
    }
});

module.exports = router;