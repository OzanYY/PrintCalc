const pool = require('../config/database');
const MaterialInventoryService = require('../services/MaterialInventoryService');
const MaterialModel = require('../models/MaterialModel');
const { getUserId, sendError } = require('../utils/controllerHelpers');

class InventoryController {

    // GET /inventory/transactions
    static async getAllTransactions(req, res) {
        try {
            const userId = getUserId(req);
            const { limit = 100, page = 1 } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const rows = await MaterialInventoryService.getAllTransactions(userId, parseInt(limit), offset);
            res.json({ success: true, data: rows });
        } catch (err) {
            sendError(res, err, 500);
        }
    }

    // GET /inventory/materials/:id/transactions
    static async getMaterialTransactions(req, res) {
        try {
            const userId = getUserId(req);
            const { id } = req.params;
            const { limit = 50, page = 1 } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const rows = await MaterialInventoryService.getTransactionsByMaterial(parseInt(id), userId, parseInt(limit), offset);
            res.json({ success: true, data: rows });
        } catch (err) {
            sendError(res, err, 500);
        }
    }

    // GET /inventory/orders/:id/transactions
    static async getOrderTransactions(req, res) {
        try {
            const userId = getUserId(req);
            const { id } = req.params;
            const rows = await MaterialInventoryService.getTransactionsByOrder(parseInt(id), userId);
            res.json({ success: true, data: rows });
        } catch (err) {
            sendError(res, err, 500);
        }
    }

    // POST /inventory/materials/:id/adjust
    // body: { amount_grams: number, is_add: boolean, note?: string }
    //   ИЛИ: { spools: number, note?: string }  — добавить/убрать N катушек
    static async adjustStock(req, res) {
        try {
            const userId = getUserId(req);
            const { id } = req.params;
            const { amount_grams, spools, is_add = true, note } = req.body;

            let grams = parseFloat(amount_grams) || 0;

            if (!grams && spools != null) {
                const mat = await MaterialModel.findById(parseInt(id), userId);
                if (!mat) return res.status(404).json({ success: false, message: 'Материал не найден' });
                grams = parseFloat(spools) * parseFloat(mat.weight_per_spool_grams || 1000);
            }

            if (grams <= 0) {
                return res.status(400).json({ success: false, message: 'amount_grams должен быть > 0' });
            }

            const result = await MaterialInventoryService.manualAdjust({
                materialId:  parseInt(id),
                userId,
                amountGrams: grams,
                isAdd:       Boolean(is_add),
                note,
            });

            res.json({
                success: true,
                data: result,
                message: is_add ? 'Остаток пополнен' : 'Остаток уменьшен',
            });
        } catch (err) {
            sendError(res, err);
        }
    }

    // PATCH /inventory/materials/:id/spool-weight
    // body: { weight_per_spool_grams: number }
    static async updateSpoolWeight(req, res) {
        try {
            const userId = getUserId(req);
            const { id } = req.params;
            const { weight_per_spool_grams } = req.body;

            const w = parseFloat(weight_per_spool_grams);
            if (!w || w <= 0) {
                return res.status(400).json({ success: false, message: 'weight_per_spool_grams должен быть > 0' });
            }

            const result = await pool.query(
                `UPDATE materials
                 SET weight_per_spool_grams = $1,
                     quantity = FLOOR(stock_grams / $1)::INTEGER,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2 AND user_id = $3
                 RETURNING *`,
                [w, parseInt(id), userId]
            );

            if (!result.rows[0]) {
                return res.status(404).json({ success: false, message: 'Материал не найден' });
            }

            res.json({ success: true, data: result.rows[0], message: 'Вес катушки обновлён' });
        } catch (err) {
            sendError(res, err);
        }
    }
}

module.exports = InventoryController;
