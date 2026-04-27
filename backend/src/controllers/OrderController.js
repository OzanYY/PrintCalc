// controllers/orderController.js
const OrderService = require('../services/orderService');

class OrderController {
    // Создание заказа
    static async createOrder(req, res) {
        try {
            // Проверяем, что пользователь авторизован
            if (!req.isAuth || !req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Необходима авторизация'
                });
            }
            
            // Получаем ID пользователя (адаптируйте под структуру вашего userData)
            const userId = req.user.id || req.user.userId || req.user._id;
            
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'ID пользователя не найден в токене'
                });
            }
            
            const orderData = req.body;
            
            // Валидация обязательных полей
            if (!orderData.name) {
                return res.status(400).json({
                    success: false,
                    message: 'Название заказа обязательно'
                });
            }
            
            const result = await OrderService.createOrder(userId, orderData);
            
            res.status(201).json({
                success: true,
                message: result.message,
                data: result.data
            });
        } catch (error) {
            console.error('Create order error:', error);
            res.status(400).json({
                success: false,
                message: error.message,
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    // Получение всех заказов пользователя
    static async getUserOrders(req, res) {
        try {
            if (!req.isAuth || !req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Необходима авторизация'
                });
            }
            
            const userId = req.user.id || req.user.userId || req.user._id;
            const { status, limit = 50, offset = 0, page = 1 } = req.query;
            
            // Преобразуем page в offset
            const calculatedOffset = (page - 1) * limit;
            
            const filters = {
                status: status || null,
                limit: parseInt(limit),
                offset: parseInt(calculatedOffset)
            };
            
            const result = await OrderService.getUserOrders(userId, filters);
            
            res.status(200).json({
                success: true,
                data: result.data,
                pagination: result.pagination,
                filters: result.filters
            });
        } catch (error) {
            console.error('Get orders error:', error);
            res.status(500).json({
                success: false,
                message: error.message,
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    // Получение заказа по ID
    static async getOrderById(req, res) {
        try {
            if (!req.isAuth || !req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Необходима авторизация'
                });
            }
            
            const userId = req.user.id || req.user.userId || req.user._id;
            const { id } = req.params;
            
            const result = await OrderService.getOrderById(id, userId);
            
            res.status(200).json({
                success: true,
                data: result.data
            });
        } catch (error) {
            if (error.message === 'Заказ не найден') {
                res.status(404).json({
                    success: false,
                    message: error.message
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: error.message,
                    error: process.env.NODE_ENV === 'development' ? error.stack : undefined
                });
            }
        }
    }

    // Обновление заказа
    static async updateOrder(req, res) {
        try {
            if (!req.isAuth || !req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Необходима авторизация'
                });
            }
            
            const userId = req.user.id || req.user.userId || req.user._id;
            const { id } = req.params;
            const updateData = req.body;
            
            const result = await OrderService.updateOrder(id, userId, updateData);
            
            res.status(200).json({
                success: true,
                message: result.message,
                data: result.data
            });
        } catch (error) {
            let statusCode = 400;
            if (error.message === 'Заказ не найден') {
                statusCode = 404;
            }
            
            res.status(statusCode).json({
                success: false,
                message: error.message,
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    // Обновление статуса заказа
    static async updateOrderStatus(req, res) {
        try {
            if (!req.isAuth || !req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Необходима авторизация'
                });
            }
            
            const userId = req.user.id || req.user.userId || req.user._id;
            const { id } = req.params;
            const { status } = req.body;
            
            if (!status) {
                return res.status(400).json({
                    success: false,
                    message: 'Статус обязателен для заполнения'
                });
            }
            
            const result = await OrderService.updateOrderStatus(id, userId, status);
            
            res.status(200).json({
                success: true,
                message: result.message,
                data: result.data
            });
        } catch (error) {
            let statusCode = 400;
            if (error.message === 'Заказ не найден') {
                statusCode = 404;
            }
            
            res.status(statusCode).json({
                success: false,
                message: error.message,
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    // Отметить заказ как выполненный
    static async completeOrder(req, res) {
        try {
            if (!req.isAuth || !req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Необходима авторизация'
                });
            }
            
            const userId = req.user.id || req.user.userId || req.user._id;
            const { id } = req.params;
            
            const result = await OrderService.updateOrderStatus(id, userId, 'completed');
            
            res.status(200).json({
                success: true,
                message: result.message,
                data: result.data
            });
        } catch (error) {
            let statusCode = 400;
            if (error.message === 'Заказ не найден') {
                statusCode = 404;
            }
            
            res.status(statusCode).json({
                success: false,
                message: error.message,
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    // Отменить заказ
    static async cancelOrder(req, res) {
        try {
            if (!req.isAuth || !req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Необходима авторизация'
                });
            }
            
            const userId = req.user.id || req.user.userId || req.user._id;
            const { id } = req.params;
            
            const result = await OrderService.updateOrderStatus(id, userId, 'cancelled');
            
            res.status(200).json({
                success: true,
                message: result.message,
                data: result.data
            });
        } catch (error) {
            let statusCode = 400;
            if (error.message === 'Заказ не найден') {
                statusCode = 404;
            }
            
            res.status(statusCode).json({
                success: false,
                message: error.message,
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    // Удаление заказа
    static async deleteOrder(req, res) {
        try {
            if (!req.isAuth || !req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Необходима авторизация'
                });
            }
            
            const userId = req.user.id || req.user.userId || req.user._id;
            const { id } = req.params;
            
            const result = await OrderService.deleteOrder(id, userId);
            
            res.status(200).json({
                success: true,
                message: result.message,
                deletedId: result.deletedId
            });
        } catch (error) {
            let statusCode = 400;
            if (error.message === 'Заказ не найден') {
                statusCode = 404;
            } else if (error.message === 'Нельзя удалить выполненный заказ') {
                statusCode = 400;
            }
            
            res.status(statusCode).json({
                success: false,
                message: error.message,
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    // Получение статистики по заказам
    static async getOrderStats(req, res) {
        try {
            if (!req.isAuth || !req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Необходима авторизация'
                });
            }
            
            const userId = req.user.id || req.user.userId || req.user._id;
            const { period = 'all' } = req.query;
            
            const result = await OrderService.getOrderStats(userId, period);
            
            res.status(200).json({
                success: true,
                data: result.data,
                period: result.period
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message,
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    // Получение заказов по статусу
    static async getOrdersByStatus(req, res) {
        try {
            if (!req.isAuth || !req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Необходима авторизация'
                });
            }
            
            const userId = req.user.id || req.user.userId || req.user._id;
            const { status } = req.params;
            const { limit = 100 } = req.query;
            
            const result = await OrderService.getOrdersByStatus(userId, status, parseInt(limit));
            
            res.status(200).json({
                success: true,
                data: result.data,
                status: result.status,
                count: result.count,
                totalByStatus: result.total_by_status
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message,
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    // Получение последних заказов
    static async getRecentOrders(req, res) {
        try {
            if (!req.isAuth || !req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Необходима авторизация'
                });
            }
            
            const userId = req.user.id || req.user.userId || req.user._id;
            const { limit = 10 } = req.query;
            
            const result = await OrderService.getRecentOrders(userId, parseInt(limit));
            
            res.status(200).json({
                success: true,
                data: result.data,
                limit: result.limit
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message,
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    // Массовое обновление статусов
    static async bulkUpdateStatus(req, res) {
        try {
            if (!req.isAuth || !req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Необходима авторизация'
                });
            }
            
            const userId = req.user.id || req.user.userId || req.user._id;
            const { orderIds, status } = req.body;
            
            if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Необходимо указать массив ID заказов'
                });
            }
            
            if (!status) {
                return res.status(400).json({
                    success: false,
                    message: 'Необходимо указать новый статус'
                });
            }
            
            const result = await OrderService.bulkUpdateStatus(userId, orderIds, status);
            
            res.status(200).json({
                success: result.success,
                message: result.message,
                data: result.data
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message,
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    // Расчет стоимости заказа (не требует авторизации, но можно оставить)
    static async calculateCost(req, res) {
        try {
            const orderData = req.body;
            
            const result = await OrderService.calculateOrderCost(orderData);
            
            res.status(200).json({
                success: true,
                data: result,
                message: 'Расчет стоимости выполнен успешно'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message,
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    // Экспорт заказов в CSV
    static async exportOrders(req, res) {
        try {
            if (!req.isAuth || !req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Необходима авторизация'
                });
            }
            
            const userId = req.user.id || req.user.userId || req.user._id;
            const { status = null } = req.query;
            
            const result = await OrderService.exportOrdersToCSV(userId, status);
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
            res.status(200).send(result.data);
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message,
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    // Клонирование заказа
    static async cloneOrder(req, res) {
        try {
            if (!req.isAuth || !req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Необходима авторизация'
                });
            }
            
            const userId = req.user.id || req.user.userId || req.user._id;
            const { id } = req.params;
            
            // Получаем существующий заказ
            const existingOrder = await OrderService.getOrderById(id, userId);
            
            // Создаем новый заказ на основе существующего
            const clonedData = {
                ...existingOrder.data,
                name: `${existingOrder.data.name} (копия)`,
                status: 'in_progress',
                created_at: undefined,
                updated_at: undefined,
                completed_at: undefined,
                id: undefined
            };
            
            const result = await OrderService.createOrder(userId, clonedData);
            
            res.status(201).json({
                success: true,
                message: 'Заказ успешно скопирован',
                data: result.data
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message,
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }
}

module.exports = OrderController;