const express = require('express');
const router = express.Router();
const PrinterController = require('../controllers/PrinterController');
const authMiddleware = require('../middleware/auth-middleware');

// Все маршруты требуют авторизации
router.use(authMiddleware);

// CRUD для принтеров
router.get('/', PrinterController.getAllPrinters);
router.get('/stats', PrinterController.getPrinterStats);
router.get('/default', PrinterController.getDefaultPrinter);
router.get('/type/:type', PrinterController.getPrintersByType);
router.get('/:id', PrinterController.getPrinterById);

router.post('/', PrinterController.createPrinter);
router.put('/:id', PrinterController.updatePrinter);
router.delete('/:id', PrinterController.deletePrinter);

router.patch('/:id/default', PrinterController.setDefaultPrinter);

module.exports = router;