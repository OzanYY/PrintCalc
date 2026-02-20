const MaterialService = require('../services/MaterialService');

class MaterialController {
    // Получение всех материалов пользователя
    static async getAllMaterials(req, res) {
        try {
            const userId = req.user.id;
            const { category } = req.query;
            
            const materials = await MaterialService.getUserMaterials(userId, category);
            
            res.json({
                success: true,
                data: materials
            });
        } catch (error) {
            console.error('Get materials error:', error);
            res.status(500).json({
                success: false,
                error: 'Ошибка при получении списка материалов'
            });
        }
    }

    // Получение конкретного материала
    static async getMaterialById(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            const material = await MaterialService.getMaterialById(id, userId);
            
            res.json({
                success: true,
                data: material
            });
        } catch (error) {
            console.error('Get material error:', error);
            
            if (error.message === 'Материал не найден') {
                return res.status(404).json({
                    success: false,
                    error: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Ошибка при получении материала'
            });
        }
    }

    // Создание материала
    static async createMaterial(req, res) {
        try {
            const userId = req.user.id;
            const materialData = req.body;

            const material = await MaterialService.createMaterial(userId, materialData);
            
            res.status(201).json({
                success: true,
                message: 'Материал успешно создан',
                data: material
            });
        } catch (error) {
            console.error('Create material error:', error);
            
            if (error.message.includes('обязательны') || 
                error.message.includes('Недопустимая категория') ||
                error.message.includes('Invalid')) {
                return res.status(400).json({
                    success: false,
                    error: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Ошибка при создании материала'
            });
        }
    }

    // Обновление материала
    static async updateMaterial(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const materialData = req.body;

            const material = await MaterialService.updateMaterial(id, userId, materialData);
            
            res.json({
                success: true,
                message: 'Материал успешно обновлен',
                data: material
            });
        } catch (error) {
            console.error('Update material error:', error);
            
            if (error.message === 'Материал не найден') {
                return res.status(404).json({
                    success: false,
                    error: error.message
                });
            }
            
            if (error.message.includes('Invalid')) {
                return res.status(400).json({
                    success: false,
                    error: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Ошибка при обновлении материала'
            });
        }
    }

    // Удаление материала
    static async deleteMaterial(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            const result = await MaterialService.deleteMaterial(id, userId);
            
            res.json({
                success: true,
                message: result.message
            });
        } catch (error) {
            console.error('Delete material error:', error);
            
            if (error.message === 'Материал не найден') {
                return res.status(404).json({
                    success: false,
                    error: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Ошибка при удалении материала'
            });
        }
    }

    // Установка материала по умолчанию
    static async setDefaultMaterial(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            const material = await MaterialService.setDefaultMaterial(id, userId);
            
            res.json({
                success: true,
                message: 'Материал по умолчанию установлен',
                data: material
            });
        } catch (error) {
            console.error('Set default material error:', error);
            
            if (error.message === 'Материал не найден') {
                return res.status(404).json({
                    success: false,
                    error: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Ошибка при установке материала по умолчанию'
            });
        }
    }

    // Получение материала по умолчанию для категории
    static async getDefaultMaterial(req, res) {
        try {
            const userId = req.user.id;
            const { category } = req.query;

            const material = await MaterialService.getDefaultMaterial(userId, category);
            
            res.json({
                success: true,
                data: material || { message: 'Материал по умолчанию не установлен' }
            });
        } catch (error) {
            console.error('Get default material error:', error);
            res.status(500).json({
                success: false,
                error: 'Ошибка при получении материала по умолчанию'
            });
        }
    }

    // Получение материалов по категории
    static async getMaterialsByCategory(req, res) {
        try {
            const userId = req.user.id;
            const { category } = req.params;

            const materials = await MaterialService.getMaterialsByCategory(userId, category);
            
            res.json({
                success: true,
                data: materials
            });
        } catch (error) {
            console.error('Get materials by category error:', error);
            
            if (error.message.includes('Недопустимая категория')) {
                return res.status(400).json({
                    success: false,
                    error: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Ошибка при получении материалов'
            });
        }
    }

    // Получение статистики по материалам
    static async getMaterialStats(req, res) {
        try {
            const userId = req.user.id;
            const stats = await MaterialService.getMaterialStats(userId);
            
            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Get material stats error:', error);
            res.status(500).json({
                success: false,
                error: 'Ошибка при получении статистики'
            });
        }
    }

    // Поиск материалов
    static async searchMaterials(req, res) {
        try {
            const userId = req.user.id;
            const { q } = req.query;

            if (!q) {
                return res.status(400).json({
                    success: false,
                    error: 'Поисковый запрос обязателен'
                });
            }

            const materials = await MaterialService.searchMaterials(userId, q);
            
            res.json({
                success: true,
                data: materials
            });
        } catch (error) {
            console.error('Search materials error:', error);
            
            if (error.message.includes('минимум 2 символа')) {
                return res.status(400).json({
                    success: false,
                    error: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Ошибка при поиске материалов'
            });
        }
    }

    // Получение доступных типов для категории
    static async getTypesByCategory(req, res) {
        try {
            const { category } = req.params;

            const types = await MaterialService.getTypesByCategory(category);
            
            res.json({
                success: true,
                data: types
            });
        } catch (error) {
            console.error('Get types by category error:', error);
            
            if (error.message.includes('Недопустимая категория')) {
                return res.status(400).json({
                    success: false,
                    error: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Ошибка при получении типов материалов'
            });
        }
    }

    // Копирование материала
    static async duplicateMaterial(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const { name } = req.body;

            const material = await MaterialService.duplicateMaterial(id, userId, name);
            
            res.status(201).json({
                success: true,
                message: 'Материал успешно скопирован',
                data: material
            });
        } catch (error) {
            console.error('Duplicate material error:', error);
            
            if (error.message === 'Исходный материал не найден') {
                return res.status(404).json({
                    success: false,
                    error: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Ошибка при копировании материала'
            });
        }
    }
}

module.exports = MaterialController;