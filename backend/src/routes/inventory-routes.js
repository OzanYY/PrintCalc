// routes/inventory-routes.js
const express = require('express');
const router  = express.Router();
const InventoryController = require('../controllers/InventoryController');
const { authMiddleware, requireAuth, requireActivated } = require('../middleware/auth-middleware');

router.use(authMiddleware);
router.use(requireAuth);
router.use(requireActivated);

// Все транзакции пользователя
router.get('/transactions', InventoryController.getAllTransactions);

// История транзакций по материалу
router.get('/materials/:id/transactions', InventoryController.getMaterialTransactions);

// История транзакций по заказу
router.get('/orders/:id/transactions', InventoryController.getOrderTransactions);

// Ручная корректировка остатка материала
router.post('/materials/:id/adjust', InventoryController.adjustStock);

// Обновить вес катушки у материала
router.patch('/materials/:id/spool-weight', InventoryController.updateSpoolWeight);

module.exports = router;