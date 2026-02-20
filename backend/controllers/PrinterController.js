const PrinterService = require('../services/PrinterService');

class PrinterController {
    // Получение всех принтеров пользователя
    static async getAllPrinters(req, res) {
        try {
            const userId = req.user.id;
            const printers = await PrinterService.getUserPrinters(userId);
            
            res.json({
                success: true,
                data: printers
            });
        } catch (error) {
            console.error('Get printers error:', error);
            res.status(500).json({
                success: false,
                error: 'Ошибка при получении списка принтеров'
            });
        }
    }

    // Получение конкретного принтера
    static async getPrinterById(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            const printer = await PrinterService.getPrinterById(id, userId);
            
            res.json({
                success: true,
                data: printer
            });
        } catch (error) {
            console.error('Get printer error:', error);
            
            if (error.message === 'Принтер не найден') {
                return res.status(404).json({
                    success: false,
                    error: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Ошибка при получении принтера'
            });
        }
    }

    // Создание принтера
    static async createPrinter(req, res) {
        try {
            const userId = req.user.id;
            const printerData = req.body;

            const printer = await PrinterService.createPrinter(userId, printerData);
            
            res.status(201).json({
                success: true,
                message: 'Принтер успешно создан',
                data: printer
            });
        } catch (error) {
            console.error('Create printer error:', error);
            
            if (error.message.includes('обязательны') || error.message.includes('Недопустимый тип')) {
                return res.status(400).json({
                    success: false,
                    error: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Ошибка при создании принтера'
            });
        }
    }

    // Обновление принтера
    static async updatePrinter(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const printerData = req.body;

            const printer = await PrinterService.updatePrinter(id, userId, printerData);
            
            res.json({
                success: true,
                message: 'Принтер успешно обновлен',
                data: printer
            });
        } catch (error) {
            console.error('Update printer error:', error);
            
            if (error.message === 'Принтер не найден') {
                return res.status(404).json({
                    success: false,
                    error: error.message
                });
            }
            
            if (error.message.includes('Недопустимый тип')) {
                return res.status(400).json({
                    success: false,
                    error: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Ошибка при обновлении принтера'
            });
        }
    }

    // Удаление принтера
    static async deletePrinter(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            const result = await PrinterService.deletePrinter(id, userId);
            
            res.json({
                success: true,
                message: result.message
            });
        } catch (error) {
            console.error('Delete printer error:', error);
            
            if (error.message === 'Принтер не найден') {
                return res.status(404).json({
                    success: false,
                    error: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Ошибка при удалении принтера'
            });
        }
    }

    // Установка принтера по умолчанию
    static async setDefaultPrinter(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            const printer = await PrinterService.setDefaultPrinter(id, userId);
            
            res.json({
                success: true,
                message: 'Принтер по умолчанию установлен',
                data: printer
            });
        } catch (error) {
            console.error('Set default printer error:', error);
            
            if (error.message === 'Принтер не найден') {
                return res.status(404).json({
                    success: false,
                    error: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Ошибка при установке принтера по умолчанию'
            });
        }
    }

    // Получение принтера по умолчанию
    static async getDefaultPrinter(req, res) {
        try {
            const userId = req.user.id;
            const printer = await PrinterService.getDefaultPrinter(userId);
            
            res.json({
                success: true,
                data: printer || { message: 'Принтер по умолчанию не установлен' }
            });
        } catch (error) {
            console.error('Get default printer error:', error);
            res.status(500).json({
                success: false,
                error: 'Ошибка при получении принтера по умолчанию'
            });
        }
    }

    // Получение статистики по принтерам
    static async getPrinterStats(req, res) {
        try {
            const userId = req.user.id;
            const stats = await PrinterService.getPrinterStats(userId);
            
            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Get printer stats error:', error);
            res.status(500).json({
                success: false,
                error: 'Ошибка при получении статистики'
            });
        }
    }

    // Получение принтеров по типу
    static async getPrintersByType(req, res) {
        try {
            const userId = req.user.id;
            const { type } = req.params;

            const printers = await PrinterService.getPrintersByType(userId, type);
            
            res.json({
                success: true,
                data: printers
            });
        } catch (error) {
            console.error('Get printers by type error:', error);
            res.status(500).json({
                success: false,
                error: 'Ошибка при получении принтеров'
            });
        }
    }
}

module.exports = PrinterController;