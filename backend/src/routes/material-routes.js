// routes/materialRoutes.js
const express = require('express');
const router  = express.Router();
const MaterialController = require('../controllers/MaterialController');
const { authMiddleware, requireAuth } = require('../middleware/auth-middleware');

router.use(authMiddleware);
router.use(requireAuth);

// ─── Служебные маршруты (до /:id) ────────────────────────────────────────────
// GET  /materials/stats                — статистика
// GET  /materials/search?q=...         — поиск
// GET  /materials/default?category=... — материал по умолчанию
// GET  /materials/types/:category      — доступные типы для категории
// GET  /materials/category/:category   — материалы по категории
router.get('/stats',               MaterialController.getMaterialStats);
router.get('/search',              MaterialController.searchMaterials);
router.get('/default',             MaterialController.getDefaultMaterial);
router.get('/types/:category',     MaterialController.getTypesByCategory);
router.get('/category/:category',  MaterialController.getMaterialsByCategory);

// ─── Коллекция ────────────────────────────────────────────────────────────────
// GET  /materials          — все материалы (query: ?category=...)
// POST /materials          — создать материал
router.get ('/', MaterialController.getAllMaterials);
router.post('/', MaterialController.createMaterial);

// ─── Единичный ресурс ─────────────────────────────────────────────────────────
// GET    /materials/:id    — получить материал
// PUT    /materials/:id    — обновить материал
// DELETE /materials/:id    — удалить материал
router.get   ('/:id', MaterialController.getMaterialById);
router.put   ('/:id', MaterialController.updateMaterial);
router.delete('/:id', MaterialController.deleteMaterial);

// ─── Действия ─────────────────────────────────────────────────────────────────
// PATCH /materials/:id/default      — установить по умолчанию
// POST  /materials/:id/duplicate    — дублировать
router.patch('/:id/default',    MaterialController.setDefaultMaterial);
router.post ('/:id/duplicate',  MaterialController.duplicateMaterial);

module.exports = router;