// controllers/ClientController.js
const ClientModel = require('../models/ClientModel');

function getUserId(req) {
    return req.user?.id ?? req.user?.userId ?? null;
}

class ClientController {
    // GET /clients
    static async list(req, res) {
        try {
            const userId = getUserId(req);
            if (!userId) return res.status(401).json({ success: false, message: 'Необходима авторизация' });
            const data = await ClientModel.findByUser(userId);
            res.json({ success: true, data });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    }

    // GET /clients/search?q=
    static async search(req, res) {
        try {
            const userId = getUserId(req);
            if (!userId) return res.status(401).json({ success: false, message: 'Необходима авторизация' });
            const data = await ClientModel.search(userId, req.query.q || '');
            res.json({ success: true, data });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    }

    // POST /clients
    static async create(req, res) {
        try {
            const userId = getUserId(req);
            if (!userId) return res.status(401).json({ success: false, message: 'Необходима авторизация' });
            if (!req.body.name) return res.status(400).json({ success: false, message: 'Имя клиента обязательно' });
            const data = await ClientModel.create(userId, req.body);
            res.status(201).json({ success: true, data });
        } catch (e) {
            res.status(400).json({ success: false, message: e.message });
        }
    }

    // PUT /clients/:id
    static async update(req, res) {
        try {
            const userId = getUserId(req);
            if (!userId) return res.status(401).json({ success: false, message: 'Необходима авторизация' });
            const data = await ClientModel.update(req.params.id, userId, req.body);
            if (!data) return res.status(404).json({ success: false, message: 'Клиент не найден' });
            res.json({ success: true, data });
        } catch (e) {
            res.status(400).json({ success: false, message: e.message });
        }
    }

    // DELETE /clients/:id
    static async delete(req, res) {
        try {
            const userId = getUserId(req);
            if (!userId) return res.status(401).json({ success: false, message: 'Необходима авторизация' });
            const data = await ClientModel.delete(req.params.id, userId);
            if (!data) return res.status(404).json({ success: false, message: 'Клиент не найден' });
            res.json({ success: true, deletedId: data.id });
        } catch (e) {
            res.status(400).json({ success: false, message: e.message });
        }
    }
}

module.exports = ClientController;
