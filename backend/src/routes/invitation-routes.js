const express = require('express');
const router  = express.Router();
const InvitationController = require('../controllers/InvitationController');
const { authMiddleware, requireAuth, requireActivated } = require('../middleware/auth-middleware');

router.use(authMiddleware);
router.use(requireAuth);
router.use(requireActivated);

// GET  /api/invitations/my          — мои входящие приглашения
// POST /api/invitations/:id/accept  — принять
// POST /api/invitations/:id/decline — отклонить
router.get ('/my',              InvitationController.getMy);
router.post('/:id/accept',      InvitationController.accept);
router.post('/:id/decline',     InvitationController.decline);

module.exports = router;
