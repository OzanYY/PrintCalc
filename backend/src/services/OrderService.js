// services/OrderService.js
const OrderModel = require('../models/OrderModel');
const MaterialInventoryService = require('./MaterialInventoryService');

class OrderService {
    // ─── Создание заказа ─────────────────────────────────────────────────────────
    static async createOrder(userId, orderData) {
        try {
            if (!userId) throw new Error('ID пользователя обязателен');
            if (!orderData.name) throw new Error('Название заказа обязательно');

            // calc_result обязателен — клиент всегда передаёт результат расчёта
            if (!orderData.calc_result || !orderData.calc_result.finalPrice) {
                throw new Error('Результат расчёта (calc_result) обязателен для создания заказа');
            }

            const order = await OrderModel.create(userId, orderData);

            // Бронируем материал, если он указан
            let materialWarning = null;
            if (order.material_id && order.total_weight_grams > 0) {
                try {
                    const result = await MaterialInventoryService.reserve({
                        materialId:  order.material_id,
                        userId,
                        orderId:     order.id,
                        amountGrams: parseFloat(order.total_weight_grams),
                    });
                    if (result.warning) materialWarning = result.warning;
                } catch (invErr) {
                    console.error('Ошибка бронирования материала:', invErr);
                }
            }

            // Перечитываем с JOIN-ами (printer, material, client, tags)
            const fullOrder = await OrderModel.findById(order.id, userId);

            return {
                success: true,
                data: fullOrder,
                message: 'Заказ успешно создан',
                material_warning: materialWarning ?? undefined,
            };
        } catch (error) {
            console.error('Ошибка при создании заказа:', error);
            throw error;
        }
    }

    // ─── Получение всех заказов пользователя с пагинацией ────────────────────────
    static async getUserOrders(userId, filters = {}) {
        try {
            const { status = null, tag_id = null, client_id = null, deadline_filter = null, order_mode = null, limit = 50, offset = 0 } = filters;
            const queryFilters = { status, tag_id, client_id, deadline_filter, order_mode };

            const [orders, total] = await Promise.all([
                OrderModel.findByUser(userId, queryFilters, limit, offset),
                OrderModel.countByUser(userId, queryFilters),
            ]);

            return {
                success: true,
                data: orders,
                pagination: { limit, offset, total },
                filters: queryFilters,
            };
        } catch (error) {
            console.error('Ошибка при получении заказов:', error);
            throw error;
        }
    }

    // ─── Получение заказа по ID ───────────────────────────────────────────────────
    static async getOrderById(orderId, userId) {
        try {
            const order = await OrderModel.findById(orderId, userId);
            if (!order) throw new Error('Заказ не найден');
            return { success: true, data: order };
        } catch (error) {
            console.error('Ошибка при получении заказа:', error);
            throw error;
        }
    }

    // ─── Обновление заказа ────────────────────────────────────────────────────────
    // updateData может содержать любое подмножество полей:
    //   name, printer_id, material_id, notes, settings,
    //   calc_materials, calc_electricity, calc_depreciation, calc_labor,
    //   calc_additional, calc_result
    //
    // Важно: если клиент пересчитал стоимость, он должен передать
    // актуальный calc_result вместе с изменёнными параметрами.
    static async updateOrder(orderId, userId, updateData) {
        try {
            const existingOrder = await OrderModel.findById(orderId, userId);
            if (!existingOrder) throw new Error('Заказ не найден');

            if (existingOrder.status !== 'in_progress') {
                throw new Error(`Нельзя редактировать заказ со статусом "${existingOrder.status}"`);
            }

            // Если параметры калькулятора изменились — calc_result тоже должен прийти
            const hasCalcParamsChange = [
                'calc_materials', 'calc_electricity',
                'calc_depreciation', 'calc_labor', 'calc_additional'
            ].some(key => updateData[key] !== undefined);

            if (hasCalcParamsChange && !updateData.calc_result) {
                throw new Error(
                    'При изменении параметров калькулятора необходимо передать обновлённый calc_result'
                );
            }

            await OrderModel.update(orderId, userId, updateData);
            // Перечитываем с JOIN-ами (printer, material, client, tags)
            const updatedOrder = await OrderModel.findById(orderId, userId);
            return {
                success: true,
                data: updatedOrder,
                message: 'Заказ успешно обновлён'
            };
        } catch (error) {
            console.error('Ошибка при обновлении заказа:', error);
            throw error;
        }
    }

    // ─── Обновление статуса ───────────────────────────────────────────────────────
    static async updateOrderStatus(orderId, userId, status) {
        try {
            const order = await OrderModel.findById(orderId, userId);
            if (!order) throw new Error('Заказ не найден');

            const validStatuses = ['in_progress', 'completed', 'cancelled'];
            if (!validStatuses.includes(status)) {
                throw new Error(`Недопустимый статус. Допустимые значения: ${validStatuses.join(', ')}`);
            }

            await OrderModel.updateStatus(orderId, userId, status);

            // Обработка инвентаря при смене статуса.
            // Материал принадлежит создателю заказа, поэтому используем order.user_id.
            const inventoryUserId = order.user_id;
            if (order.material_id && order.total_weight_grams > 0) {
                const amountGrams = parseFloat(order.total_weight_grams);
                try {
                    if (status === 'completed' && order.status === 'in_progress') {
                        await MaterialInventoryService.consume({
                            materialId:  order.material_id,
                            userId:      inventoryUserId,
                            orderId,
                            amountGrams,
                        });
                    } else if (status === 'cancelled' && order.status === 'in_progress') {
                        const reserved = await MaterialInventoryService.getReservedForOrder(
                            orderId, order.material_id, inventoryUserId
                        );
                        if (reserved > 0) {
                            await MaterialInventoryService.release({
                                materialId:  order.material_id,
                                userId:      inventoryUserId,
                                orderId,
                                amountGrams: reserved,
                            });
                        }
                    } else if (status === 'in_progress' && order.status === 'completed') {
                        // Откат завершённого заказа: возвращаем бронирование материала
                        try {
                            await MaterialInventoryService.reserve({
                                materialId:  order.material_id,
                                userId:      inventoryUserId,
                                orderId,
                                amountGrams,
                                note: `Возобновление заказа #${orderId}`,
                            });
                        } catch (reserveErr) {
                            console.error('Ошибка повторного бронирования материала при откате заказа:', reserveErr);
                        }
                    }
                } catch (invErr) {
                    console.error('Ошибка операции с инвентарём:', invErr);
                }
            }

            const statusMessages = {
                completed:   'Заказ отмечен как выполненный',
                cancelled:   'Заказ отменён',
                in_progress: 'Заказ возобновлён'
            };

            // Перечитываем с JOIN-ами (printer, material, client, tags)
            const fullUpdatedOrder = await OrderModel.findById(orderId, userId);

            return {
                success: true,
                data: fullUpdatedOrder,
                message: statusMessages[status] || 'Статус заказа обновлён'
            };
        } catch (error) {
            console.error('Ошибка при обновлении статуса заказа:', error);
            throw error;
        }
    }

    // ─── Удаление заказа ─────────────────────────────────────────────────────────
    static async deleteOrder(orderId, userId) {
        try {
            const order = await OrderModel.findById(orderId, userId);
            if (!order) throw new Error('Заказ не найден');

            if (order.status === 'completed') {
                throw new Error('Нельзя удалить выполненный заказ');
            }

            // Снимаем бронь материала, если заказ был «в процессе»
            if (order.status === 'in_progress' && order.material_id && order.total_weight_grams > 0) {
                try {
                    const reserved = await MaterialInventoryService.getReservedForOrder(
                        orderId, order.material_id, userId
                    );
                    if (reserved > 0) {
                        await MaterialInventoryService.release({
                            materialId:  order.material_id,
                            userId,
                            orderId,
                            amountGrams: reserved,
                            note:        `Снятие брони при удалении заказа #${orderId}`,
                        });
                    }
                } catch (invErr) {
                    console.error('Ошибка снятия брони при удалении заказа:', invErr);
                }
            }

            const deleted = await OrderModel.delete(orderId, userId);
            if (!deleted) throw new Error('Не удалось удалить заказ');

            return {
                success: true,
                message: 'Заказ успешно удалён',
                deletedId: orderId
            };
        } catch (error) {
            console.error('Ошибка при удалении заказа:', error);
            throw error;
        }
    }

    // ─── Статистика ───────────────────────────────────────────────────────────────
    static async getOrderStats(userId, period = 'all', orderMode = null) {
        try {
            const [stats, statusStats, monthlyStats] = await Promise.all([
                OrderModel.getStats(userId, period, orderMode),
                OrderModel.getStatusStats(userId, orderMode),
                OrderModel.getMonthlyStats(userId, null, orderMode),
            ]);

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
                data: { summary: stats, by_status: statusStats, monthly: monthlyStats, analytics },
                period
            };
        } catch (error) {
            console.error('Ошибка при получении статистики:', error);
            throw error;
        }
    }

    // ─── Заказы по статусу ────────────────────────────────────────────────────────
    static async getOrdersByStatus(userId, status, limit = 100) {
        try {
            const validStatuses = ['in_progress', 'completed', 'cancelled'];
            if (!validStatuses.includes(status)) {
                throw new Error(`Недопустимый статус. Допустимые значения: ${validStatuses.join(', ')}`);
            }

            const [orders, stats] = await Promise.all([
                OrderModel.findByStatus(userId, status, limit),
                OrderModel.countByStatus(userId)
            ]);

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

    // ─── Последние заказы ─────────────────────────────────────────────────────────
    static async getRecentOrders(userId, limit = 10) {
        try {
            const orders = await OrderModel.getRecentOrders(userId, limit);
            return { success: true, data: orders, limit };
        } catch (error) {
            console.error('Ошибка при получении последних заказов:', error);
            throw error;
        }
    }

    // ─── Массовое обновление статусов ────────────────────────────────────────────
    static async bulkUpdateStatus(userId, orderIds, newStatus) {
        try {
            const validStatuses = ['in_progress', 'completed', 'cancelled'];
            if (!validStatuses.includes(newStatus)) {
                throw new Error(`Недопустимый статус. Допустимые значения: ${validStatuses.join(', ')}`);
            }

            // Один батч-запрос вместо N последовательных
            const updated = await OrderModel.bulkUpdateStatus(userId, orderIds, newStatus);
            const updatedCount = updated.length;
            const failedCount  = orderIds.length - updatedCount;

            const completedAt = newStatus === 'completed' ? new Date() : null;

            return {
                success: failedCount === 0,
                data: {
                    successful:       updated.map(o => ({ orderId: o.id, success: true })),
                    failed:           [],
                    total:            orderIds.length,
                    successful_count: updatedCount,
                    failed_count:     failedCount,
                },
                message: `Обновлено ${updatedCount} из ${orderIds.length} заказов`
            };
        } catch (error) {
            console.error('Ошибка при массовом обновлении статусов:', error);
            throw error;
        }
    }

}

module.exports = OrderService;