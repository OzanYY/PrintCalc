const { PrinterModel, VALID_TYPES } = require('../models/PrinterModel');

class PrinterService {
    // ─── Список ───────────────────────────────────────────────────────────────
    static async getUserPrinters(userId) {
        return PrinterModel.findByUser(userId);
    }

    // ─── По ID ────────────────────────────────────────────────────────────────
    static async getPrinterById(id, userId) {
        const printer = await PrinterModel.findById(id, userId);
        if (!printer) throw new Error('Принтер не найден');
        return printer;
    }

    // ─── Создание ─────────────────────────────────────────────────────────────
    static async createPrinter(userId, printerData) {
        const { name, type } = printerData;

        if (!name || !type) throw new Error('Название и тип принтера обязательны');
        if (!VALID_TYPES.includes(type)) {
            throw new Error(`Недопустимый тип принтера. Допустимые значения: ${VALID_TYPES.join(', ')}`);
        }

        return PrinterModel.create(userId, printerData);
    }

    // ─── Обновление ───────────────────────────────────────────────────────────
    static async updatePrinter(id, userId, printerData) {
        const existing = await PrinterModel.findById(id, userId);
        if (!existing) throw new Error('Принтер не найден');

        if (printerData.type && !VALID_TYPES.includes(printerData.type)) {
            throw new Error(`Недопустимый тип принтера. Допустимые значения: ${VALID_TYPES.join(', ')}`);
        }

        const updated = await PrinterModel.update(id, userId, printerData);
        if (!updated) throw new Error('Принтер не найден');
        return updated;
    }

    // ─── Удаление ─────────────────────────────────────────────────────────────
    static async deletePrinter(id, userId) {
        const result = await PrinterModel.delete(id, userId);
        if (!result) throw new Error('Принтер не найден');
        return { message: 'Принтер успешно удалён', id: result.id };
    }

    // ─── Установить по умолчанию ──────────────────────────────────────────────
    static async setDefaultPrinter(id, userId) {
        const printer = await PrinterModel.setDefault(id, userId);
        if (!printer) throw new Error('Принтер не найден');
        return printer;
    }

    // ─── Принтер по умолчанию ─────────────────────────────────────────────────
    static async getDefaultPrinter(userId) {
        return PrinterModel.findDefault(userId);
    }

    // ─── Статистика ───────────────────────────────────────────────────────────
    static async getPrinterStats(userId) {
        return PrinterModel.getUserStats(userId);
    }

    // ─── По типу ──────────────────────────────────────────────────────────────
    static async getPrintersByType(userId, type) {
        if (!VALID_TYPES.includes(type)) {
            throw new Error(`Недопустимый тип принтера. Допустимые значения: ${VALID_TYPES.join(', ')}`);
        }
        const printers = await PrinterModel.findByUser(userId);
        return printers.filter(p => p.type === type);
    }
}

module.exports = PrinterService;