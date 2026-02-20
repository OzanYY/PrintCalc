const PrinterModel = require('../models/PrinterModel');

class PrinterService {
    // Получение всех принтеров пользователя
    static async getUserPrinters(userId) {
        return PrinterModel.findByUser(userId);
    }

    // Получение конкретного принтера
    static async getPrinterById(id, userId) {
        const printer = await PrinterModel.findById(id, userId);
        if (!printer) {
            throw new Error('Принтер не найден');
        }
        return printer;
    }

    // Создание нового принтера
    static async createPrinter(userId, printerData) {
        const { name, type, model, purchase_price, print_lifetime_hours, power_consumption, is_default, settings } = printerData;

        // Валидация обязательных полей
        if (!name || !type) {
            throw new Error('Название и тип принтера обязательны');
        }

        // Проверка допустимого типа
        const validTypes = ['FDM', 'SLA', 'SLS', 'PolyJet'];
        if (!validTypes.includes(type)) {
            throw new Error(`Недопустимый тип принтера. Допустимые значения: ${validTypes.join(', ')}`);
        }

        // Создаем принтер
        const printer = await PrinterModel.create(userId, {
            name,
            type,
            model,
            purchase_price,
            print_lifetime_hours,
            power_consumption,
            is_default,
            settings
        });

        return printer;
    }

    // Обновление принтера
    static async updatePrinter(id, userId, printerData) {
        // Проверяем существование принтера
        const existingPrinter = await PrinterModel.findById(id, userId);
        if (!existingPrinter) {
            throw new Error('Принтер не найден');
        }

        // Валидация типа, если передан
        if (printerData.type) {
            const validTypes = ['FDM', 'SLA', 'SLS', 'PolyJet'];
            if (!validTypes.includes(printerData.type)) {
                throw new Error(`Недопустимый тип принтера. Допустимые значения: ${validTypes.join(', ')}`);
            }
        }

        const updatedPrinter = await PrinterModel.update(id, userId, printerData);
        return updatedPrinter;
    }

    // Удаление принтера
    static async deletePrinter(id, userId) {
        const result = await PrinterModel.delete(id, userId);
        if (!result) {
            throw new Error('Принтер не найден');
        }
        return { message: 'Принтер успешно удален', id: result.id };
    }

    // Установка принтера по умолчанию
    static async setDefaultPrinter(id, userId) {
        const printer = await PrinterModel.setDefault(id, userId);
        if (!printer) {
            throw new Error('Принтер не найден');
        }
        return printer;
    }

    // Получение принтера по умолчанию
    static async getDefaultPrinter(userId) {
        const printer = await PrinterModel.findDefault(userId);
        return printer || null;
    }

    // Получение статистики по принтерам
    static async getPrinterStats(userId) {
        return PrinterModel.getUserStats(userId);
    }

    // Получение принтеров по типу
    static async getPrintersByType(userId, type) {
        const printers = await PrinterModel.findByUser(userId);
        return printers.filter(p => p.type === type);
    }
}

module.exports = PrinterService;