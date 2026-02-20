const express = require('express');
const router = express.Router();
const MaterialController = require('../controllers/MaterialController');
const authMiddleware = require('../middleware/auth-middleware');

// Все маршруты требуют авторизации
router.use(authMiddleware);

// CRUD для материалов
router.get('/', MaterialController.getAllMaterials);
router.get('/stats', MaterialController.getMaterialStats);
router.get('/search', MaterialController.searchMaterials);
router.get('/default', MaterialController.getDefaultMaterial);
router.get('/types/:category', MaterialController.getTypesByCategory);
router.get('/category/:category', MaterialController.getMaterialsByCategory);
router.get('/:id', MaterialController.getMaterialById);

router.post('/', MaterialController.createMaterial);
router.post('/:id/duplicate', MaterialController.duplicateMaterial);
router.put('/:id', MaterialController.updateMaterial);
router.delete('/:id', MaterialController.deleteMaterial);

router.patch('/:id/default', MaterialController.setDefaultMaterial);

module.exports = router;