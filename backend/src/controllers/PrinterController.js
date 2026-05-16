// controllers/printerController.js
const PrinterService = require('../services/PrinterService');

// ─── Утилиты (те же что в orderController) ───────────────────────────────────

function getUserId(req) {
    return req.user?.id ?? req.user?.userId ?? req.user?._id ?? null;
}

function errorStatus(message, fallback = 400) {
    if (message === 'Принтер не найден') return 404;
    if (message === 'Необходима авторизация') return 401;
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

class PrinterController {
    // GET /printers
    static async getAllPrinters(req, res) {
        try {
            const printers = await PrinterService.getUserPrinters(getUserId(req));
            res.json({ success: true, data: printers });
        } catch (error) {
            console.error('Get printers error:', error);
            sendError(res, error, 500);
        }
    }

    // GET /printers/default
    static async getDefaultPrinter(req, res) {
        try {
            const printer = await PrinterService.getDefaultPrinter(getUserId(req));
            res.json({ success: true, data: printer });
        } catch (error) {
            console.error('Get default printer error:', error);
            sendError(res, error, 500);
        }
    }

    // GET /printers/stats
    static async getPrinterStats(req, res) {
        try {
            const stats = await PrinterService.getPrinterStats(getUserId(req));
            res.json({ success: true, data: stats });
        } catch (error) {
            console.error('Get printer stats error:', error);
            sendError(res, error, 500);
        }
    }

    // GET /printers/type/:type
    static async getPrintersByType(req, res) {
        try {
            const printers = await PrinterService.getPrintersByType(getUserId(req), req.params.type);
            res.json({ success: true, data: printers });
        } catch (error) {
            console.error('Get printers by type error:', error);
            sendError(res, error);
        }
    }

    // GET /printers/:id
    static async getPrinterById(req, res) {
        try {
            const printer = await PrinterService.getPrinterById(req.params.id, getUserId(req));
            res.json({ success: true, data: printer });
        } catch (error) {
            console.error('Get printer error:', error);
            sendError(res, error, 500);
        }
    }

    // POST /printers
    static async createPrinter(req, res) {
        try {
            const printer = await PrinterService.createPrinter(getUserId(req), req.body);
            res.status(201).json({ success: true, message: 'Принтер успешно создан', data: printer });
        } catch (error) {
            console.error('Create printer error:', error);
            sendError(res, error);
        }
    }

    // PUT /printers/:id
    static async updatePrinter(req, res) {
        try {
            const printer = await PrinterService.updatePrinter(req.params.id, getUserId(req), req.body);
            res.json({ success: true, message: 'Принтер успешно обновлён', data: printer });
        } catch (error) {
            console.error('Update printer error:', error);
            sendError(res, error);
        }
    }

    // DELETE /printers/:id
    static async deletePrinter(req, res) {
        try {
            const result = await PrinterService.deletePrinter(req.params.id, getUserId(req));
            res.json({ success: true, message: result.message });
        } catch (error) {
            console.error('Delete printer error:', error);
            sendError(res, error);
        }
    }

    // PATCH /printers/:id/default
    static async setDefaultPrinter(req, res) {
        try {
            const printer = await PrinterService.setDefaultPrinter(req.params.id, getUserId(req));
            res.json({ success: true, message: 'Принтер по умолчанию установлен', data: printer });
        } catch (error) {
            console.error('Set default printer error:', error);
            sendError(res, error);
        }
    }
}

module.exports = PrinterController;