const MaterialModel = require('../models/MaterialModel');

class MaterialService {
    // Получение всех материалов пользователя
    static async getUserMaterials(userId, category = null) {
        return MaterialModel.findByUser(userId, category);
    }

    // Получение конкретного материала
    static async getMaterialById(id, userId) {
        const material = await MaterialModel.findById(id, userId);
        if (!material) {
            throw new Error('Материал не найден');
        }
        return material;
    }

    // Создание нового материала
    static async createMaterial(userId, materialData) {
        const { 
            name, category, type, brand, color, 
            price_per_kg, density, diameter, is_default, settings 
        } = materialData;

        // Валидация обязательных полей
        if (!name || !category || !type) {
            throw new Error('Название, категория и тип материала обязательны');
        }

        // Проверка категории
        const validCategories = ['filament', 'resin', 'powder', 'other'];
        if (!validCategories.includes(category)) {
            throw new Error(`Недопустимая категория. Допустимые значения: ${validCategories.join(', ')}`);
        }

        // Валидация типа через модель
        MaterialModel.validateType(category, type);

        // Создаем материал
        const material = await MaterialModel.create(userId, {
            name,
            category,
            type,
            brand,
            color,
            price_per_kg,
            density,
            diameter,
            is_default,
            settings
        });

        return material;
    }

    // Обновление материала
    static async updateMaterial(id, userId, materialData) {
        // Проверяем существование материала
        const existingMaterial = await MaterialModel.findById(id, userId);
        if (!existingMaterial) {
            throw new Error('Материал не найден');
        }

        // Если меняется категория или тип, проверяем совместимость
        if (materialData.category && materialData.type) {
            MaterialModel.validateType(materialData.category, materialData.type);
        } else if (materialData.category) {
            MaterialModel.validateType(materialData.category, existingMaterial.type);
        } else if (materialData.type) {
            MaterialModel.validateType(existingMaterial.category, materialData.type);
        }

        const updatedMaterial = await MaterialModel.update(id, userId, materialData);
        return updatedMaterial;
    }

    // Удаление материала
    static async deleteMaterial(id, userId) {
        const result = await MaterialModel.delete(id, userId);
        if (!result) {
            throw new Error('Материал не найден');
        }
        return { message: 'Материал успешно удален', id: result.id };
    }

    // Установка материала по умолчанию для его категории
    static async setDefaultMaterial(id, userId) {
        const material = await MaterialModel.setDefault(id, userId);
        if (!material) {
            throw new Error('Материал не найден');
        }
        return material;
    }

    // Получение материала по умолчанию для категории
    static async getDefaultMaterial(userId, category = null) {
        const material = await MaterialModel.findDefault(userId, category);
        return material || null;
    }

    // Получение материалов по категории
    static async getMaterialsByCategory(userId, category) {
        const validCategories = ['filament', 'resin', 'powder', 'other'];
        if (!validCategories.includes(category)) {
            throw new Error(`Недопустимая категория. Допустимые значения: ${validCategories.join(', ')}`);
        }
        return MaterialModel.findByCategory(userId, category);
    }

    // Получение материалов по типу
    static async getMaterialsByType(userId, type) {
        return MaterialModel.findByType(userId, type);
    }

    // Получение статистики по материалам
    static async getMaterialStats(userId) {
        return MaterialModel.getUserStats(userId);
    }

    // Поиск материалов
    static async searchMaterials(userId, searchTerm) {
        if (!searchTerm || searchTerm.length < 2) {
            throw new Error('Поисковый запрос должен содержать минимум 2 символа');
        }
        return MaterialModel.search(userId, searchTerm);
    }

    // Получение доступных типов для категории
    static async getTypesByCategory(category) {
        const validCategories = ['filament', 'resin', 'powder', 'other'];
        if (!validCategories.includes(category)) {
            throw new Error(`Недопустимая категория. Допустимые значения: ${validCategories.join(', ')}`);
        }
        return MaterialModel.getTypesByCategory(category);
    }

    // Копирование материала
    static async duplicateMaterial(id, userId, newName) {
        const material = await MaterialModel.duplicate(id, userId, newName);
        if (!material) {
            throw new Error('Исходный материал не найден');
        }
        return material;
    }
}

module.exports = MaterialService;