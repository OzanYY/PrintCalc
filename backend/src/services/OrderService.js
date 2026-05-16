// services/OrderService.js
const OrderModel = require('../models/OrderModel');

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

    // ─── Получение всех заказов пользователя с пагинацией ────────────────────────
    static async getUserOrders(userId, filters = {}) {
        try {
            const { status = null, limit = 50, offset = 0 } = filters;
            const orders = await OrderModel.findByUser(userId, status, limit, offset);
            const stats  = await OrderModel.getStats(userId);

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

            const updatedOrder = await OrderModel.update(orderId, userId, updateData);
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

            const updatedOrder = await OrderModel.updateStatus(orderId, userId, status);
            const statusMessages = {
                completed:   'Заказ отмечен как выполненный',
                cancelled:   'Заказ отменён',
                in_progress: 'Заказ возобновлён'
            };

            return {
                success: true,
                data: updatedOrder,
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
    static async getOrderStats(userId, period = 'all') {
        try {
            const [stats, statusStats, monthlyStats] = await Promise.all([
                OrderModel.getStats(userId, period),
                OrderModel.getStatusStats(userId),
                OrderModel.getMonthlyStats(userId)
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
            const results = [];
            const errors  = [];

            for (const orderId of orderIds) {
                try {
                    const result = await this.updateOrderStatus(orderId, userId, newStatus);
                    results.push({ orderId, success: true, message: result.message });
                } catch (error) {
                    errors.push({ orderId, success: false, error: error.message });
                }
            }

            return {
                success: errors.length === 0,
                data: {
                    successful:       results,
                    failed:           errors,
                    total:            orderIds.length,
                    successful_count: results.length,
                    failed_count:     errors.length
                },
                message: `Обновлено ${results.length} из ${orderIds.length} заказов`
            };
        } catch (error) {
            console.error('Ошибка при массовом обновлении статусов:', error);
            throw error;
        }
    }

    // ─── Экспорт в CSV ────────────────────────────────────────────────────────────
    static async exportOrdersToCSV(userId, status = null) {
        try {
            const orders = await OrderModel.findByUser(userId, status, 10000, 0);

            const headers = [
                'ID', 'Название', 'Статус',
                'Вес модели(г)', 'Вес поддержек(г)', 'Общий вес(г)',
                'Время печати(мин)',
                'Материал(цена/кг)', 'Электроэнергия(Вт)', 'Амортизация(принтер)',
                'Ставка(час)', 'Время работы(мин)', 'Доп.расходы(%)', 'Маржа(%)',
                'Себестоимость', 'Итоговая цена', 'Прибыль',
                'Цена за грамм',
                'Дата создания', 'Дата завершения'
            ];

            const escape = (v) => {
                const s = String(v ?? '');
                return s.includes(',') ? `"${s.replace(/"/g, '""')}"` : s;
            };

            const rows = [headers];

            for (const order of orders) {
                const m   = order.calc_materials    || {};
                const e   = order.calc_electricity  || {};
                const d   = order.calc_depreciation || {};
                const l   = order.calc_labor        || {};
                const a   = order.calc_additional   || {};
                const r   = order.calc_result       || {};

                const totalWeight = r.totalWeight?.grams ?? 0;
                const modelWeight   = totalWeight - (m.supportWeight ?? 0);
                const finalPrice  = r.finalPrice?.value  ?? 0;
                const fullCost    = r.fullCost?.value    ?? 0;
                const profit      = (finalPrice - fullCost).toFixed(2);

                rows.push([
                    order.id,
                    order.name,
                    order.status,
                    modelWeight,
                    m.supportWeight     ?? 0,
                    totalWeight,
                    e.printTime         ?? 0,
                    m.filamentPrice     ?? 0,
                    e.powerConsumption  ?? 0,
                    d.printerCost       ?? 0,
                    l.hourlyRate        ?? 0,
                    l.workTime          ?? 0,
                    a.additionalExpensesPercent ?? 0,
                    a.marginPercent     ?? 0,
                    fullCost,
                    finalPrice,
                    profit,
                    r.pricePerGram?.value ?? 0,
                    new Date(order.created_at).toLocaleDateString('ru-RU'),
                    order.completed_at
                        ? new Date(order.completed_at).toLocaleDateString('ru-RU')
                        : '-'
                ].map(escape));
            }

            return {
                success: true,
                data: rows.map(r => r.join(',')).join('\n'),
                filename: `orders_${Date.now()}.csv`
            };
        } catch (error) {
            console.error('Ошибка при экспорте заказов:', error);
            throw error;
        }
    }
}

module.exports = OrderService;