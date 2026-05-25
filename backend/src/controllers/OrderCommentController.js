const OrderCommentModel = require('../models/OrderCommentModel');
const { getUserId } = require('../utils/controllerHelpers');

class OrderCommentController {
    // GET /orders/:orderId/comments
    static async list(req, res) {
        try {
            const data = await OrderCommentModel.findByOrder(req.params.orderId);
            res.json({ success: true, data });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    }

    // POST /orders/:orderId/comments
    static async create(req, res) {
        try {
            const userId = getUserId(req);
            if (!userId) return res.status(401).json({ success: false, message: 'Необходима авторизация' });
            const { body } = req.body;
            if (!body?.trim()) return res.status(400).json({ success: false, message: 'Комментарий не может быть пустым' });
            const data = await OrderCommentModel.create(req.params.orderId, userId, body);
            res.status(201).json({ success: true, data });
        } catch (e) {
            res.status(400).json({ success: false, message: e.message });
        }
    }

    // PUT /orders/:orderId/comments/:commentId
    static async update(req, res) {
        try {
            const userId = getUserId(req);
            if (!userId) return res.status(401).json({ success: false, message: 'Необходима авторизация' });
            const { body } = req.body;
            if (!body?.trim()) return res.status(400).json({ success: false, message: 'Комментарий не может быть пустым' });
            const data = await OrderCommentModel.update(req.params.commentId, userId, body);
            if (!data) return res.status(404).json({ success: false, message: 'Комментарий не найден' });
            res.json({ success: true, data });
        } catch (e) {
            res.status(400).json({ success: false, message: e.message });
        }
    }

    // DELETE /orders/:orderId/comments/:commentId
    static async delete(req, res) {
        try {
            const userId = getUserId(req);
            if (!userId) return res.status(401).json({ success: false, message: 'Необходима авторизация' });
            const data = await OrderCommentModel.delete(req.params.commentId, userId);
            if (!data) return res.status(404).json({ success: false, message: 'Комментарий не найден' });
            res.json({ success: true, deletedId: data.id });
        } catch (e) {
            res.status(400).json({ success: false, message: e.message });
        }
    }
}

module.exports = OrderCommentController;
