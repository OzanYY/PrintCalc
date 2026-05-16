// routes/printerRoutes.js
const express = require('express');
const router  = express.Router();
const PrinterController = require('../controllers/printerController');
const { authMiddleware, requireAuth } = require('../middleware/auth-middleware');

router.use(authMiddleware);
router.use(requireAuth);

// ─── Служебные маршруты (до /:id) ────────────────────────────────────────────
// GET  /printers/default       — принтер по умолчанию
// GET  /printers/stats         — статистика
// GET  /printers/type/:type    — фильтр по типу (FDM | SLA | SLS | PolyJet)
router.get('/default',      PrinterController.getDefaultPrinter);
router.get('/stats',        PrinterController.getPrinterStats);
router.get('/type/:type',   PrinterController.getPrintersByType);

// ─── Коллекция ────────────────────────────────────────────────────────────────
// GET  /printers               — все принтеры пользователя
// POST /printers               — создать принтер
router.get ('/', PrinterController.getAllPrinters);
router.post('/', PrinterController.createPrinter);

// ─── Единичный ресурс ─────────────────────────────────────────────────────────
// GET    /printers/:id         — получить принтер
// PUT    /printers/:id         — обновить принтер
// DELETE /printers/:id         — удалить принтер
router.get   ('/:id', PrinterController.getPrinterById);
router.put   ('/:id', PrinterController.updatePrinter);
router.delete('/:id', PrinterController.deletePrinter);

// ─── Действия ─────────────────────────────────────────────────────────────────
// PATCH /printers/:id/default  — установить принтер по умолчанию
router.patch('/:id/default', PrinterController.setDefaultPrinter);

module.exports = router;