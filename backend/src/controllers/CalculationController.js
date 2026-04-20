const CalculationService = require('../services/CalculationService');

class CalculationController {
    /**
     * Расчет стоимости
     */
    static async calculate(req, res) {
        try {
            const params = req.body;
            
            // Базовая валидация обязательных полей
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

            // Выполняем расчет
            const result = CalculationService.calculate(params);

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            console.error('Calculation error:', error);
            
            if (error.message.includes('Поля не могут быть отрицательными')) {
                return res.status(400).json({
                    success: false,
                    error: error.message
                });
            }

            res.status(500).json({
                success: false,
                error: 'Ошибка при расчете стоимости'
            });
        }
    }

    /**
     * Расчет с использованием принтера и материала из БД
     */
    static async calculateWithPresets(req, res) {
        try {
            const userId = req.user?.id; // если есть авторизация
            const { printerId, materialId, ...params } = req.body;

            const dbData = {};

            // Если есть ID принтера, получаем его из БД
            if (printerId && userId) {
                const PrinterModel = require('../models/PrinterModel');
                const printer = await PrinterModel.findById(printerId, userId);
                if (printer) {
                    dbData.printer = printer;
                }
            }

            // Если есть ID материала, получаем его из БД
            if (materialId && userId) {
                const MaterialModel = require('../models/MaterialModel');
                const material = await MaterialModel.findById(materialId, userId);
                if (material) {
                    dbData.material = material;
                }
            }

            const result = await CalculationService.calculateWithPresets(params, dbData);

            res.json({
                success: true,
                data: result,
                usedPresets: {
                    printer: dbData.printer ? { id: dbData.printer.id, name: dbData.printer.name } : null,
                    material: dbData.material ? { id: dbData.material.id, name: dbData.material.name } : null
                }
            });

        } catch (error) {
            console.error('Calculation with presets error:', error);
            res.status(500).json({
                success: false,
                error: 'Ошибка при расчете стоимости'
            });
        }
    }
}

module.exports = CalculationController;