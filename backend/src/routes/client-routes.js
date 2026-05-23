// routes/client-routes.js
const express          = require('express');
const router           = express.Router();
const ClientController = require('../controllers/ClientController');
const { authMiddleware, requireAuth, requireActivated } = require('../middleware/auth-middleware');

router.use(authMiddleware);
router.use(requireAuth);
router.use(requireActivated);

router.get   ('/',        ClientController.list);
router.get   ('/search',  ClientController.search);
router.post  ('/',        ClientController.create);
router.put   ('/:id',     ClientController.update);
router.delete('/:id',     ClientController.delete);

module.exports = router;
