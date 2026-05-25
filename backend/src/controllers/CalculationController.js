const CalculationService = require('../services/CalculationService');
const PrinterModel = require('../models/PrinterModel');
const MaterialModel = require('../models/MaterialModel');

class CalculationController {
    static async calculate(req, res) {
        try {
            const params = req.body;

            const required = [
                'modelWeight', 'supportWeight', 'filamentPrice',
                'powerConsumption', 'printTime', 'electricityPrice',
                'printerCost', 'printResource',
                'hourlyRate', 'workTime',
                'additionalExpensesPercent', 'marginPercent'
            ];

            const missing = required.filter(field => params[field] === undefined);
            if (missing.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: `Отсутствуют обязательные поля: ${missing.join(', ')}`
                });
            }

            const result = CalculationService.calculate(params);
            res.json({ success: true, data: result });
        } catch (error) {
            console.error('Calculation error:', error);
            if (error.message.includes('Поля не могут быть отрицательными')) {
                return res.status(400).json({ success: false, error: error.message });
            }
            res.status(500).json({ success: false, error: 'Ошибка при расчете стоимости' });
        }
    }

    static async calculateWithPresets(req, res) {
        try {
            const userId = req.user?.id;
            const { printerId, materialId, ...params } = req.body;

            const dbData = {};

            if (printerId && userId) {
                const printer = await PrinterModel.findById(printerId, userId);
                if (printer) dbData.printer = printer;
            }

            if (materialId && userId) {
                const material = await MaterialModel.findById(materialId, userId);
                if (material) dbData.material = material;
            }

            const result = await CalculationService.calculateWithPresets(params, dbData);

            res.json({
                success: true,
                data: result,
                usedPresets: {
                    printer:  dbData.printer  ? { id: dbData.printer.id,  name: dbData.printer.name  } : null,
                    material: dbData.material ? { id: dbData.material.id, name: dbData.material.name } : null,
                },
            });
        } catch (error) {
            console.error('Calculation with presets error:', error);
            res.status(500).json({ success: false, error: 'Ошибка при расчете стоимости' });
        }
    }
}

module.exports = CalculationController;
