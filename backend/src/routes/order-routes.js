// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/orderController');
const { requireAuth } = require('../middleware/auth-middleware');

// Все маршруты для заказов требуют авторизации
router.use(requireAuth); // Добавляем эту строку для защиты всех маршрутов

// Основные CRUD операции
router.post('/', OrderController.createOrder);
router.get('/', OrderController.getUserOrders);
router.get('/stats', OrderController.getOrderStats);
router.get('/recent', OrderController.getRecentOrders);
router.get('/export', OrderController.exportOrders);
router.post('/bulk-update', OrderController.bulkUpdateStatus);
router.post('/calculate-cost', OrderController.calculateCost);

// Операции со статусами
router.get('/status/:status', OrderController.getOrdersByStatus);
router.patch('/:id/status', OrderController.updateOrderStatus);
router.patch('/:id/complete', OrderController.completeOrder);
router.patch('/:id/cancel', OrderController.cancelOrder);

// Операции с конкретным заказом
router.get('/:id', OrderController.getOrderById);
router.put('/:id', OrderController.updateOrder);
router.patch('/:id', OrderController.updateOrder);
router.delete('/:id', OrderController.deleteOrder);
router.post('/:id/clone', OrderController.cloneOrder);

module.exports = router;