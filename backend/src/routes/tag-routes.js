// routes/tag-routes.js
const express       = require('express');
const router        = express.Router();
const TagController = require('../controllers/TagController');
const { authMiddleware } = require('../middleware/auth-middleware');

router.use(authMiddleware);

// Управление тегами пользователя
router.get   ('/',    TagController.list);
router.post  ('/',    TagController.create);
router.put   ('/:id', TagController.update);
router.delete('/:id', TagController.delete);

module.exports = router;
