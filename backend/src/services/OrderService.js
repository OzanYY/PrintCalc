// services/OrderService.js
const OrderModel = require('../models/OrderModel');

class OrderService {
    // Создание заказа
    static async createOrder(userId, orderData) {
        try {
            // Валидация обязательных полей
            if (!userId) {
                throw new Error('ID пользователя обязателен');
            }
            if (!orderData.name) {
                throw new Error('Название заказа обязательно');
            }

            // Автоматический расчет стоимости, если не указана
            let calculatedData = {};
            if (!orderData.final_price && orderData.total_weight_grams && orderData.print_time_minutes) {
                calculatedData = await this.calculateOrderCost(orderData);
            }

            const mergedData = {
                ...orderData,
                ...calculatedData
            };

            const order = await OrderModel.create(userId, mergedData);
            return {
                success: true,
                data: order,
                message: 'Заказ успешно создан'
            };
        } catch (error) {
            console.error('Ошибка при создании заказа:', error);
            throw error;
        }
    }

    // Получение всех заказов пользователя с пагинацией
    static async getUserOrders(userId, filters = {}) {
        try {
            const { status = null, limit = 50, offset = 0 } = filters;
            const orders = await OrderModel.findByUser(userId, status, limit, offset);
            
            // Получаем общее количество заказов для пагинации
            const stats = await OrderModel.getStats(userId);
            
            return {
                success: true,
                data: orders,
                pagination: {
                    limit,
                    offset,
                    total: parseInt(stats.total_orders) || 0
                },
                filters: { status }
            };
        } catch (error) {
            console.error('Ошибка при получении заказов:', error);
            throw error;
        }
    }

    // Получение заказа по ID
    static async getOrderById(orderId, userId) {
        try {
            const order = await OrderModel.findById(orderId, userId);
            if (!order) {
                throw new Error('Заказ не найден');
            }
            return {
                success: true,
                data: order
            };
        } catch (error) {
            console.error('Ошибка при получении заказа:', error);
            throw error;
        }
    }

    // Обновление заказа
    static async updateOrder(orderId, userId, updateData) {
        try {
            // Проверяем существование заказа
            const existingOrder = await OrderModel.findById(orderId, userId);
            if (!existingOrder) {
                throw new Error('Заказ не найден');
            }

            // Нельзя редактировать завершенные или отмененные заказы
            if (existingOrder.status !== 'in_progress') {
                throw new Error(`Нельзя редактировать заказ со статусом "${existingOrder.status}"`);
            }

            // Автоматический перерасчет стоимости при изменении параметров
            const hasWeightChange = updateData.total_weight_grams !== undefined || 
                                   updateData.print_time_minutes !== undefined;
            
            if (hasWeightChange) {
                const currentData = {
                    total_weight_grams: updateData.total_weight_grams || existingOrder.total_weight_grams,
                    print_time_minutes: updateData.print_time_minutes || existingOrder.print_time_minutes,
                    material_cost: updateData.material_cost || existingOrder.material_cost
                };
                const calculatedCosts = await this.calculateOrderCost(currentData);
                updateData = { ...updateData, ...calculatedCosts };
            }

            const updatedOrder = await OrderModel.update(orderId, userId, updateData);
            return {
                success: true,
                data: updatedOrder,
                message: 'Заказ успешно обновлен'
            };
        } catch (error) {
            console.error('Ошибка при обновлении заказа:', error);
            throw error;
        }
    }

    // Обновление статуса заказа
    static async updateOrderStatus(orderId, userId, status) {
        try {
            const order = await OrderModel.findById(orderId, userId);
            if (!order) {
                throw new Error('Заказ не найден');
            }

            const validStatuses = ['in_progress', 'completed', 'cancelled'];
            if (!validStatuses.includes(status)) {
                throw new Error(`Недопустимый статус. Допустимые значения: ${validStatuses.join(', ')}`);
            }

            const updatedOrder = await OrderModel.updateStatus(orderId, userId, status);
            const statusMessages = {
                'completed': 'Заказ отмечен как выполненный',
                'cancelled': 'Заказ отменен',
                'in_progress': 'Заказ возобновлен'
            };

            return {
                success: true,
                data: updatedOrder,
                message: statusMessages[status] || 'Статус заказа обновлен'
            };
        } catch (error) {
            console.error('Ошибка при обновлении статуса заказа:', error);
            throw error;
        }
    }

    // Удаление заказа
    static async deleteOrder(orderId, userId) {
        try {
            const order = await OrderModel.findById(orderId, userId);
            if (!order) {
                throw new Error('Заказ не найден');
            }

            // Можно удалять только отмененные заказы или заказы in_progress
            if (order.status === 'completed') {
                throw new Error('Нельзя удалить выполненный заказ');
            }

            const deletedOrder = await OrderModel.delete(orderId, userId);
            if (!deletedOrder) {
                throw new Error('Не удалось удалить заказ');
            }

            return {
                success: true,
                message: 'Заказ успешно удален',
                deletedId: orderId
            };
        } catch (error) {
            console.error('Ошибка при удалении заказа:', error);
            throw error;
        }
    }

    // Получение статистики по заказам
    static async getOrderStats(userId, period = 'all') {
        try {
            const stats = await OrderModel.getStats(userId, period);
            const statusStats = await OrderModel.getStatusStats(userId);
            const monthlyStats = await OrderModel.getMonthlyStats(userId);
            
            // Расчет дополнительной аналитики
            const analytics = {
                conversion_rate: stats.total_orders > 0 
                    ? ((stats.completed_orders / stats.total_orders) * 100).toFixed(2)
                    : 0,
                average_profit_margin: stats.total_revenue > 0
                    ? ((stats.total_profit / stats.total_revenue) * 100).toFixed(2)
                    : 0,
                average_cost_per_gram: stats.total_filament_used > 0
                    ? (stats.total_expenses / stats.total_filament_used).toFixed(2)
                    : 0
            };

            return {
                success: true,
                data: {
                    summary: stats,
                    by_status: statusStats,
                    monthly: monthlyStats,
                    analytics
                },
                period
            };
        } catch (error) {
            console.error('Ошибка при получении статистики:', error);
            throw error;
        }
    }

    // Получение заказов по статусу
    static async getOrdersByStatus(userId, status, limit = 100) {
        try {
            const validStatuses = ['in_progress', 'completed', 'cancelled'];
            if (!validStatuses.includes(status)) {
                throw new Error(`Недопустимый статус. Допустимые значения: ${validStatuses.join(', ')}`);
            }

            const orders = await OrderModel.findByStatus(userId, status, limit);
            const stats = await OrderModel.countByStatus(userId);
            
            return {
                success: true,
                data: orders,
                status,
                count: orders.length,
                total_by_status: stats
            };
        } catch (error) {
            console.error('Ошибка при получении заказов по статусу:', error);
            throw error;
        }
    }

    // Получение последних заказов
    static async getRecentOrders(userId, limit = 10) {
        try {
            const orders = await OrderModel.getRecentOrders(userId, limit);
            return {
                success: true,
                data: orders,
                limit
            };
        } catch (error) {
            console.error('Ошибка при получении последних заказов:', error);
            throw error;
        }
    }

    // Массовое обновление статусов заказов
    static async bulkUpdateStatus(userId, orderIds, newStatus) {
        try {
            const results = [];
            const errors = [];

            for (const orderId of orderIds) {
                try {
                    const result = await this.updateOrderStatus(orderId, userId, newStatus);
                    results.push({
                        orderId,
                        success: true,
                        message: result.message
                    });
                } catch (error) {
                    errors.push({
                        orderId,
                        success: false,
                        error: error.message
                    });
                }
            }

            return {
                success: errors.length === 0,
                data: {
                    successful: results,
                    failed: errors,
                    total: orderIds.length,
                    successful_count: results.length,
                    failed_count: errors.length
                },
                message: `Обновлено ${results.length} из ${orderIds.length} заказов`
            };
        } catch (error) {
            console.error('Ошибка при массовом обновлении статусов:', error);
            throw error;
        }
    }

    // Расчет стоимости заказа
    static async calculateOrderCost(orderData) {
        const {
            total_weight_grams = 0,
            print_time_minutes = 0,
            material_cost_per_gram = 2, // стоимость за грамм материала по умолчанию
            electricity_cost_per_hour = 5, // стоимость электроэнергии за час
            hourly_rate = 500, // стоимость часа работы
            depreciation_rate = 0.1 // норма амортизации (10% от стоимости оборудования)
        } = orderData;

        // Расчет себестоимости
        const materialCost = total_weight_grams * material_cost_per_gram;
        const electricityCost = (print_time_minutes / 60) * electricity_cost_per_hour;
        const laborCost = (print_time_minutes / 60) * hourly_rate;
        const depreciationCost = materialCost * depreciation_rate; // Упрощенный расчет амортизации
        
        const totalCost = materialCost + electricityCost + laborCost + depreciationCost;
        
        // Наценка (например 30%)
        const marginPercent = orderData.margin_percent || 30;
        const finalPrice = totalCost * (1 + marginPercent / 100);

        return {
            material_cost: parseFloat(materialCost.toFixed(2)),
            electricity_cost: parseFloat(electricityCost.toFixed(2)),
            labor_cost: parseFloat(laborCost.toFixed(2)),
            depreciation_cost: parseFloat(depreciationCost.toFixed(2)),
            total_cost: parseFloat(totalCost.toFixed(2)),
            final_price: parseFloat(finalPrice.toFixed(2)),
            margin_percent: marginPercent
        };
    }

    // Экспорт заказов в CSV
    static async exportOrdersToCSV(userId, status = null) {
        try {
            const orders = await OrderModel.findByUser(userId, status, 10000, 0);
            
            const headers = [
                'ID', 'Название', 'Статус', 'Вес модели(г)', 'Вес поддержек(г)',
                'Общий вес(г)', 'Время печати(мин)', 'Себестоимость', 'Цена продажи',
                'Прибыль', 'Дата создания', 'Дата завершения'
            ];
            
            const csvRows = [headers];
            
            for (const order of orders) {
                const profit = order.final_price - order.total_cost;
                csvRows.push([
                    order.id,
                    order.name,
                    order.status,
                    order.model_weight_grams,
                    order.support_weight_grams,
                    order.total_weight_grams,
                    order.print_time_minutes,
                    order.total_cost,
                    order.final_price,
                    profit.toFixed(2),
                    new Date(order.created_at).toLocaleDateString('ru-RU'),
                    order.completed_at ? new Date(order.completed_at).toLocaleDateString('ru-RU') : '-'
                ]);
            }
            
            const csvContent = csvRows.map(row => row.join(',')).join('\n');
            
            return {
                success: true,
                data: csvContent,
                filename: `orders_${Date.now()}.csv`
            };
        } catch (error) {
            console.error('Ошибка при экспорте заказов:', error);
            throw error;
        }
    }
}

module.exports = OrderService;