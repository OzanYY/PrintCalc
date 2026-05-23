const express = require('express');
const router  = express.Router();
const NotificationController = require('../controllers/NotificationController');
const { authMiddleware, requireAuth } = require('../middleware/auth-middleware');

router.use(authMiddleware);
router.use(requireAuth);

// SSE stream (requireActivated намеренно не применяется — нужен для всех авторизованных)
router.get('/stream', NotificationController.stream);

router.get ('/',             NotificationController.getAll);
router.get ('/unread-count', NotificationController.getUnreadCount);
router.patch('/read-all',    NotificationController.markAllRead);
router.patch('/:id/read',    NotificationController.markRead);
router.delete('/:id',        NotificationController.deleteOne);

module.exports = router;
