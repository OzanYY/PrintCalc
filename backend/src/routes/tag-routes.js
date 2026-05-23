// routes/tag-routes.js
const express       = require('express');
const router        = express.Router();
const TagController = require('../controllers/TagController');
const { authMiddleware, requireAuth, requireActivated } = require('../middleware/auth-middleware');

router.use(authMiddleware);
router.use(requireAuth);
router.use(requireActivated);

// Управление тегами пользователя
router.get   ('/',    TagController.list);
router.post  ('/',    TagController.create);
router.put   ('/:id', TagController.update);
router.delete('/:id', TagController.delete);

module.exports = router;
