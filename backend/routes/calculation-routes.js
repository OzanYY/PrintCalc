const express = require('express');
const router = express.Router();
const CalculationController = require('../controllers/CalculationController');
const authMiddleware = require('../middleware/auth-middleware');

// Публичный маршрут (не требует авторизации)
router.post('/calculate', CalculationController.calculate);

// Защищенный маршрут (требует авторизацию для использования пресетов)
router.post('/calculate-with-presets', authMiddleware, CalculationController.calculateWithPresets);

module.exports = router;