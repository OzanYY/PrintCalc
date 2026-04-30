// controllers/materialController.js
const MaterialService = require('../services/MaterialService');

// ─── Утилиты ──────────────────────────────────────────────────────────────────

function getUserId(req) {
    return req.user?.id ?? req.user?.userId ?? req.user?._id ?? null;
}

function errorStatus(message, fallback = 400) {
    if (message === 'Материал не найден' || message === 'Исходный материал не найден') return 404;
    return fallback;
}

function sendError(res, error, fallback = 400) {
    res.status(errorStatus(error.message, fallback)).json({
        success: false,
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
}

// ─── Контроллер ───────────────────────────────────────────────────────────────

class MaterialController {
    // GET /materials?category=...
    static async getAllMaterials(req, res) {
        try {
            const { category } = req.query;
            const materials = await MaterialService.getUserMaterials(getUserId(req), category);
            res.json({ success: true, data: materials });
        } catch (error) {
            console.error('Get materials error:', error);
            sendError(res, error, 500);
        }
    }

    // GET /materials/stats
    static async getMaterialStats(req, res) {
        try {
            const stats = await MaterialService.getMaterialStats(getUserId(req));
            res.json({ success: true, data: stats });
        } catch (error) {
            console.error('Get material stats error:', error);
            sendError(res, error, 500);
        }
    }

    // GET /materials/search?q=...
    static async searchMaterials(req, res) {
        try {
            const { q } = req.query;
            if (!q) return res.status(400).json({ success: false, message: 'Поисковый запрос обязателен' });
            const materials = await MaterialService.searchMaterials(getUserId(req), q);
            res.json({ success: true, data: materials });
        } catch (error) {
            console.error('Search materials error:', error);
            sendError(res, error);
        }
    }

    // GET /materials/default?category=...
    static async getDefaultMaterial(req, res) {
        try {
            const { category } = req.query;
            const material = await MaterialService.getDefaultMaterial(getUserId(req), category);
            res.json({ success: true, data: material });
        } catch (error) {
            console.error('Get default material error:', error);
            sendError(res, error, 500);
        }
    }

    // GET /materials/types/:category
    static async getTypesByCategory(req, res) {
        try {
            const types = await MaterialService.getTypesByCategory(req.params.category);
            res.json({ success: true, data: types });
        } catch (error) {
            console.error('Get types error:', error);
            sendError(res, error);
        }
    }

    // GET /materials/category/:category
    static async getMaterialsByCategory(req, res) {
        try {
            const materials = await MaterialService.getMaterialsByCategory(getUserId(req), req.params.category);
            res.json({ success: true, data: materials });
        } catch (error) {
            console.error('Get materials by category error:', error);
            sendError(res, error);
        }
    }

    // GET /materials/:id
    static async getMaterialById(req, res) {
        try {
            const material = await MaterialService.getMaterialById(req.params.id, getUserId(req));
            res.json({ success: true, data: material });
        } catch (error) {
            console.error('Get material error:', error);
            sendError(res, error, 500);
        }
    }

    // POST /materials
    static async createMaterial(req, res) {
        try {
            const material = await MaterialService.createMaterial(getUserId(req), req.body);
            res.status(201).json({ success: true, message: 'Материал успешно создан', data: material });
        } catch (error) {
            console.error('Create material error:', error);
            sendError(res, error);
        }
    }

    // PUT /materials/:id
    static async updateMaterial(req, res) {
        try {
            const material = await MaterialService.updateMaterial(req.params.id, getUserId(req), req.body);
            res.json({ success: true, message: 'Материал успешно обновлён', data: material });
        } catch (error) {
            console.error('Update material error:', error);
            sendError(res, error);
        }
    }

    // DELETE /materials/:id
    static async deleteMaterial(req, res) {
        try {
            const result = await MaterialService.deleteMaterial(req.params.id, getUserId(req));
            res.json({ success: true, message: result.message });
        } catch (error) {
            console.error('Delete material error:', error);
            sendError(res, error);
        }
    }

    // PATCH /materials/:id/default
    static async setDefaultMaterial(req, res) {
        try {
            const material = await MaterialService.setDefaultMaterial(req.params.id, getUserId(req));
            res.json({ success: true, message: 'Материал по умолчанию установлен', data: material });
        } catch (error) {
            console.error('Set default material error:', error);
            sendError(res, error);
        }
    }

    // POST /materials/:id/duplicate
    static async duplicateMaterial(req, res) {
        try {
            const material = await MaterialService.duplicateMaterial(req.params.id, getUserId(req), req.body.name);
            res.status(201).json({ success: true, message: 'Материал успешно скопирован', data: material });
        } catch (error) {
            console.error('Duplicate material error:', error);
            sendError(res, error);
        }
    }
}

module.exports = MaterialController;