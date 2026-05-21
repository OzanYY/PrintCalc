// ============================================================
// PATCH для backend/src/routes/order-routes.js
// Добавить ПОСЛЕ существующих маршрутов (до module.exports)
// ============================================================

const TagController         = require('../controllers/TagController');
const OrderCommentController = require('../controllers/OrderCommentController');

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

// ─── В server.js добавить регистрацию новых роутов ────────────────────────────
// app.use('/api/clients', require('./routes/client-routes'));
// app.use('/api/tags',    require('./routes/tag-routes'));
// (order-routes уже зарегистрирован, новые маршруты добавлены внутрь него)
