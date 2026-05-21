// routes/orderRoutes.js
const express = require('express');
const router  = express.Router();
const OrderController = require('../controllers/orderController');
const TagController         = require('../controllers/TagController');
const OrderCommentController = require('../controllers/OrderCommentController');
const { authMiddleware, requireAuth } = require('../middleware/auth-middleware');

// Все маршруты требуют авторизации
router.use(authMiddleware);

// ─── Коллекция ────────────────────────────────────────────────────────────────
// GET    /orders            — список заказов с пагинацией и фильтром по статусу
// POST   /orders            — создать заказ
router.get ('/',    OrderController.getUserOrders);
router.post('/',    OrderController.createOrder);

// ─── Служебные маршруты (до /:id, чтобы не перехватывались им) ───────────────
// GET   /orders/recent      — последние N заказов
// GET   /orders/stats       — сводная статистика (query: ?period=all|week|month|year)
// GET   /orders/export      — экспорт в CSV     (query: ?status=...)
// PATCH /orders/bulk-status — массовое обновление статуса
//                             body: { orderIds: number[], status: string }
router.get  ('/recent',       OrderController.getRecentOrders);
router.get  ('/stats',        OrderController.getOrderStats);
router.get  ('/export',       OrderController.exportOrders);
router.patch('/bulk-status',  OrderController.bulkUpdateStatus);

// ─── Фильтрация по статусу ────────────────────────────────────────────────────
// GET /orders/status/:status  — заказы конкретного статуса (query: ?limit=100)
router.get('/status/:status', OrderController.getOrdersByStatus);

// ─── Единичный ресурс ─────────────────────────────────────────────────────────
// GET    /orders/:id          — получить заказ
// PUT    /orders/:id          — обновить параметры / результат расчёта
// DELETE /orders/:id          — удалить заказ (только in_progress / cancelled)
router.get   ('/:id', OrderController.getOrderById);
router.put   ('/:id', OrderController.updateOrder);
router.delete('/:id', OrderController.deleteOrder);

// ─── Действия над заказом ─────────────────────────────────────────────────────
// PATCH /orders/:id/status    — произвольная смена статуса  body: { status }
// PATCH /orders/:id/complete  — пометить выполненным
// PATCH /orders/:id/cancel    — отменить
// POST  /orders/:id/clone     — клонировать
router.patch('/:id/status',   OrderController.updateOrderStatus);
router.patch('/:id/complete', OrderController.completeOrder);
router.patch('/:id/cancel',   OrderController.cancelOrder);
router.post ('/:id/clone',    OrderController.cloneOrder);

// ─── Теги заказа ──────────────────────────────────────────────────────────────
// GET    /orders/:orderId/tags             — теги заказа
// PUT    /orders/:orderId/tags             — заменить все теги { tagIds: [] }
// POST   /orders/:orderId/tags/:tagId      — добавить тег
// DELETE /orders/:orderId/tags/:tagId      — убрать тег
router.get   ('/:orderId/tags',          TagController.getOrderTags);
router.put   ('/:orderId/tags',          TagController.setOrderTags);
router.post  ('/:orderId/tags/:tagId',   TagController.addOrderTag);
router.delete('/:orderId/tags/:tagId',   TagController.removeOrderTag);

// ─── Комментарии заказа ───────────────────────────────────────────────────────
// GET    /orders/:orderId/comments                    — история комментариев
// POST   /orders/:orderId/comments                    — добавить комментарий
// PUT    /orders/:orderId/comments/:commentId         — редактировать
// DELETE /orders/:orderId/comments/:commentId         — удалить
router.get   ('/:orderId/comments',                  OrderCommentController.list);
router.post  ('/:orderId/comments',                  OrderCommentController.create);
router.put   ('/:orderId/comments/:commentId',       OrderCommentController.update);
router.delete('/:orderId/comments/:commentId',       OrderCommentController.delete);

module.exports = router;