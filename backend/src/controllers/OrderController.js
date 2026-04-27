// controllers/orderController.js
const OrderService = require('../services/orderService');

// ─── Вспомогательные утилиты ──────────────────────────────────────────────────

/**
 * Извлекает userId из объекта req.user.
 * Возвращает null, если пользователь не авторизован.
 */
function getUserId(req) {
    return req.user?.id ?? req.user?.userId ?? req.user?._id ?? null;
}

/**
 * Проверяет авторизацию и наличие userId.
 * Возвращает userId или отправляет ответ с ошибкой и возвращает null.
 */
function requireAuth(req, res) {
    if (!req.isAuth || !req.user) {
        res.status(401).json({ success: false, message: 'Необходима авторизация' });
        return null;
    }
    const userId = getUserId(req);
    if (!userId) {
        res.status(400).json({ success: false, message: 'ID пользователя не найден в токене' });
        return null;
    }
    return userId;
}

/**
 * Определяет HTTP-статус по тексту ошибки.
 */
function errorStatus(message, fallback = 400) {
    if (message === 'Заказ не найден') return 404;
    if (message === 'Необходима авторизация') return 401;
    return fallback;
}

/**
 * Отправляет ответ с ошибкой.
 */
function sendError(res, error, fallbackStatus = 400) {
    res.status(errorStatus(error.message, fallbackStatus)).json({
        success: false,
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
}

// ─── Контроллер ───────────────────────────────────────────────────────────────

class OrderController {

    // POST /orders
    static async createOrder(req, res) {
        try {
            const userId = requireAuth(req, res);
            if (!userId) return;

            const orderData = req.body;

            if (!orderData.name) {
                return res.status(400).json({ success: false, message: 'Название заказа обязательно' });
            }
            if (!orderData.calc_result?.finalPrice) {
                return res.status(400).json({
                    success: false,
                    message: 'Результат расчёта (calc_result) обязателен для создания заказа'
                });
            }

            const result = await OrderService.createOrder(userId, orderData);
            res.status(201).json({ success: true, message: result.message, data: result.data });
        } catch (error) {
            console.error('Create order error:', error);
            sendError(res, error);
        }
    }

    // GET /orders
    static async getUserOrders(req, res) {
        try {
            const userId = requireAuth(req, res);
            if (!userId) return;

            const { status, limit = 50, page = 1 } = req.query;
            const parsedLimit  = parseInt(limit);
            const parsedOffset = (parseInt(page) - 1) * parsedLimit;

            const result = await OrderService.getUserOrders(userId, {
                status: status || null,
                limit:  parsedLimit,
                offset: parsedOffset
            });

            res.status(200).json({
                success:    true,
                data:       result.data,
                pagination: result.pagination,
                filters:    result.filters
            });
        } catch (error) {
            console.error('Get orders error:', error);
            sendError(res, error, 500);
        }
    }

    // GET /orders/recent
    static async getRecentOrders(req, res) {
        try {
            const userId = requireAuth(req, res);
            if (!userId) return;

            const { limit = 10 } = req.query;
            const result = await OrderService.getRecentOrders(userId, parseInt(limit));

            res.status(200).json({ success: true, data: result.data, limit: result.limit });
        } catch (error) {
            console.error('Get recent orders error:', error);
            sendError(res, error, 500);
        }
    }

    // GET /orders/stats
    static async getOrderStats(req, res) {
        try {
            const userId = requireAuth(req, res);
            if (!userId) return;

            const { period = 'all' } = req.query;
            const result = await OrderService.getOrderStats(userId, period);

            res.status(200).json({ success: true, data: result.data, period: result.period });
        } catch (error) {
            console.error('Get order stats error:', error);
            sendError(res, error, 500);
        }
    }

    // GET /orders/status/:status
    static async getOrdersByStatus(req, res) {
        try {
            const userId = requireAuth(req, res);
            if (!userId) return;

            const { status } = req.params;
            const { limit = 100 } = req.query;

            const result = await OrderService.getOrdersByStatus(userId, status, parseInt(limit));

            res.status(200).json({
                success:       true,
                data:          result.data,
                status:        result.status,
                count:         result.count,
                totalByStatus: result.total_by_status
            });
        } catch (error) {
            console.error('Get orders by status error:', error);
            sendError(res, error);
        }
    }

    // GET /orders/:id
    static async getOrderById(req, res) {
        try {
            const userId = requireAuth(req, res);
            if (!userId) return;

            const result = await OrderService.getOrderById(req.params.id, userId);
            res.status(200).json({ success: true, data: result.data });
        } catch (error) {
            console.error('Get order by id error:', error);
            sendError(res, error, 500);
        }
    }

    // PUT /orders/:id
    // Body может содержать любое подмножество:
    //   name, printer_id, material_id, notes, settings,
    //   calc_materials, calc_electricity, calc_depreciation,
    //   calc_labor, calc_additional, calc_result
    static async updateOrder(req, res) {
        try {
            const userId = requireAuth(req, res);
            if (!userId) return;

            const result = await OrderService.updateOrder(req.params.id, userId, req.body);
            res.status(200).json({ success: true, message: result.message, data: result.data });
        } catch (error) {
            console.error('Update order error:', error);
            sendError(res, error);
        }
    }

    // PATCH /orders/:id/status
    static async updateOrderStatus(req, res) {
        try {
            const userId = requireAuth(req, res);
            if (!userId) return;

            const { status } = req.body;
            if (!status) {
                return res.status(400).json({ success: false, message: 'Статус обязателен для заполнения' });
            }

            const result = await OrderService.updateOrderStatus(req.params.id, userId, status);
            res.status(200).json({ success: true, message: result.message, data: result.data });
        } catch (error) {
            console.error('Update order status error:', error);
            sendError(res, error);
        }
    }

    // PATCH /orders/:id/complete
    static async completeOrder(req, res) {
        try {
            const userId = requireAuth(req, res);
            if (!userId) return;

            const result = await OrderService.updateOrderStatus(req.params.id, userId, 'completed');
            res.status(200).json({ success: true, message: result.message, data: result.data });
        } catch (error) {
            console.error('Complete order error:', error);
            sendError(res, error);
        }
    }

    // PATCH /orders/:id/cancel
    static async cancelOrder(req, res) {
        try {
            const userId = requireAuth(req, res);
            if (!userId) return;

            const result = await OrderService.updateOrderStatus(req.params.id, userId, 'cancelled');
            res.status(200).json({ success: true, message: result.message, data: result.data });
        } catch (error) {
            console.error('Cancel order error:', error);
            sendError(res, error);
        }
    }

    // DELETE /orders/:id
    static async deleteOrder(req, res) {
        try {
            const userId = requireAuth(req, res);
            if (!userId) return;

            const result = await OrderService.deleteOrder(req.params.id, userId);
            res.status(200).json({ success: true, message: result.message, deletedId: result.deletedId });
        } catch (error) {
            console.error('Delete order error:', error);
            sendError(res, error);
        }
    }

    // PATCH /orders/bulk-status
    // Body: { orderIds: number[], status: string }
    static async bulkUpdateStatus(req, res) {
        try {
            const userId = requireAuth(req, res);
            if (!userId) return;

            const { orderIds, status } = req.body;

            if (!Array.isArray(orderIds) || orderIds.length === 0) {
                return res.status(400).json({ success: false, message: 'Необходимо указать массив ID заказов' });
            }
            if (!status) {
                return res.status(400).json({ success: false, message: 'Необходимо указать новый статус' });
            }

            const result = await OrderService.bulkUpdateStatus(userId, orderIds, status);
            res.status(200).json({ success: result.success, message: result.message, data: result.data });
        } catch (error) {
            console.error('Bulk update status error:', error);
            sendError(res, error, 500);
        }
    }

    // GET /orders/export
    // Query: ?status=completed
    static async exportOrders(req, res) {
        try {
            const userId = requireAuth(req, res);
            if (!userId) return;

            const { status = null } = req.query;
            const result = await OrderService.exportOrdersToCSV(userId, status);

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            res.status(200).send(result.data);
        } catch (error) {
            console.error('Export orders error:', error);
            sendError(res, error, 500);
        }
    }

    // POST /orders/:id/clone
    // Создаёт копию заказа с тем же calc_result и параметрами калькулятора,
    // сбрасывая статус в in_progress и добавляя суффикс "(копия)" к названию.
    static async cloneOrder(req, res) {
        try {
            const userId = requireAuth(req, res);
            if (!userId) return;

            const { data: original } = await OrderService.getOrderById(req.params.id, userId);

            const clonedData = {
                printer_id:        original.printer_id,
                material_id:       original.material_id,
                name:              `${original.name} (копия)`,
                notes:             original.notes,
                settings:          original.settings,
                // Параметры калькулятора копируются как есть
                calc_materials:    original.calc_materials,
                calc_electricity:  original.calc_electricity,
                calc_depreciation: original.calc_depreciation,
                calc_labor:        original.calc_labor,
                calc_additional:   original.calc_additional,
                // Результат расчёта тоже копируется — он актуален для тех же параметров
                calc_result:       original.calc_result,
            };

            const result = await OrderService.createOrder(userId, clonedData);
            res.status(201).json({ success: true, message: 'Заказ успешно скопирован', data: result.data });
        } catch (error) {
            console.error('Clone order error:', error);
            sendError(res, error);
        }
    }
}

module.exports = OrderController;