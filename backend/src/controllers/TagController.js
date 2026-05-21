// controllers/TagController.js
const TagModel = require('../models/TagModel');

function getUserId(req) {
    return req.user?.id ?? req.user?.userId ?? null;
}

class TagController {
    // GET /tags
    static async list(req, res) {
        try {
            const userId = getUserId(req);
            if (!userId) return res.status(401).json({ success: false, message: 'Необходима авторизация' });
            const data = await TagModel.findByUser(userId);
            res.json({ success: true, data });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    }

    // POST /tags
    static async create(req, res) {
        try {
            const userId = getUserId(req);
            if (!userId) return res.status(401).json({ success: false, message: 'Необходима авторизация' });
            if (!req.body.name) return res.status(400).json({ success: false, message: 'Имя тега обязательно' });
            const data = await TagModel.create(userId, req.body);
            res.status(201).json({ success: true, data });
        } catch (e) {
            res.status(400).json({ success: false, message: e.message });
        }
    }

    // PUT /tags/:id
    static async update(req, res) {
        try {
            const userId = getUserId(req);
            if (!userId) return res.status(401).json({ success: false, message: 'Необходима авторизация' });
            const data = await TagModel.update(req.params.id, userId, req.body);
            if (!data) return res.status(404).json({ success: false, message: 'Тег не найден' });
            res.json({ success: true, data });
        } catch (e) {
            res.status(400).json({ success: false, message: e.message });
        }
    }

    // DELETE /tags/:id
    static async delete(req, res) {
        try {
            const userId = getUserId(req);
            if (!userId) return res.status(401).json({ success: false, message: 'Необходима авторизация' });
            const data = await TagModel.delete(req.params.id, userId);
            if (!data) return res.status(404).json({ success: false, message: 'Тег не найден' });
            res.json({ success: true, deletedId: data.id });
        } catch (e) {
            res.status(400).json({ success: false, message: e.message });
        }
    }

    // ─── Теги заказа ──────────────────────────────────────────────────────────

    // GET /orders/:orderId/tags
    static async getOrderTags(req, res) {
        try {
            const data = await TagModel.getOrderTags(req.params.orderId);
            res.json({ success: true, data });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    }

    // PUT /orders/:orderId/tags  — body: { tagIds: number[] }
    static async setOrderTags(req, res) {
        try {
            const { tagIds = [] } = req.body;
            const data = await TagModel.setOrderTags(req.params.orderId, tagIds);
            res.json({ success: true, data });
        } catch (e) {
            res.status(400).json({ success: false, message: e.message });
        }
    }

    // POST /orders/:orderId/tags/:tagId
    static async addOrderTag(req, res) {
        try {
            const data = await TagModel.addOrderTag(req.params.orderId, req.params.tagId);
            res.json({ success: true, data });
        } catch (e) {
            res.status(400).json({ success: false, message: e.message });
        }
    }

    // DELETE /orders/:orderId/tags/:tagId
    static async removeOrderTag(req, res) {
        try {
            const data = await TagModel.removeOrderTag(req.params.orderId, req.params.tagId);
            res.json({ success: true, data });
        } catch (e) {
            res.status(400).json({ success: false, message: e.message });
        }
    }
}

module.exports = TagController;
