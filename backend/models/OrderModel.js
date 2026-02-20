// models/OrderModel.js
const pool = require('../config/database');

class OrderModel {
    // Создание таблицы заказов
    static async createTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS orders (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                printer_id BIGINT REFERENCES printers(id) ON DELETE SET NULL,
                material_id BIGINT REFERENCES materials(id) ON DELETE SET NULL,
                name VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
                
                -- Параметры модели
                model_weight_grams DECIMAL(10,2) DEFAULT 0,
                support_weight_grams DECIMAL(10,2) DEFAULT 0,
                total_weight_grams DECIMAL(10,2) DEFAULT 0,
                print_time_minutes INTEGER DEFAULT 0,
                
                -- Финансы
                material_cost DECIMAL(10,2) DEFAULT 0,
                electricity_cost DECIMAL(10,2) DEFAULT 0,
                depreciation_cost DECIMAL(10,2) DEFAULT 0,
                labor_cost DECIMAL(10,2) DEFAULT 0,
                additional_expenses DECIMAL(10,2) DEFAULT 0,
                total_cost DECIMAL(10,2) DEFAULT 0,
                margin_percent INTEGER DEFAULT 0,
                final_price DECIMAL(10,2) DEFAULT 0,
                
                -- Дополнительные данные
                notes TEXT,
                settings JSONB DEFAULT '{}',
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
            CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
            CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
            CREATE INDEX IF NOT EXISTS idx_orders_printer ON orders(printer_id);
            CREATE INDEX IF NOT EXISTS idx_orders_material ON orders(material_id);
        `;
        await pool.query(query);
    }

    // Создание заказа
    static async create(userId, orderData) {
        const {
            printer_id, material_id, name,
            model_weight_grams, support_weight_grams, total_weight_grams,
            print_time_minutes,
            material_cost, electricity_cost, depreciation_cost, labor_cost,
            additional_expenses, total_cost, margin_percent, final_price,
            notes, settings
        } = orderData;

        const query = `
            INSERT INTO orders (
                user_id, printer_id, material_id, name, status,
                model_weight_grams, support_weight_grams, total_weight_grams,
                print_time_minutes,
                material_cost, electricity_cost, depreciation_cost, labor_cost,
                additional_expenses, total_cost, margin_percent, final_price,
                notes, settings
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING *
        `;
        const values = [
            userId, printer_id || null, material_id || null, name, 'in_progress',
            model_weight_grams || 0, support_weight_grams || 0, total_weight_grams || 0,
            print_time_minutes || 0,
            material_cost || 0, electricity_cost || 0, depreciation_cost || 0, labor_cost || 0,
            additional_expenses || 0, total_cost || 0, margin_percent || 0, final_price || 0,
            notes, settings || {}
        ];
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // Получение всех заказов пользователя
    static async findByUser(userId, status = null, limit = 50, offset = 0) {
        let query = `
            SELECT o.*, 
                   p.name as printer_name, p.type as printer_type,
                   m.name as material_name, m.category as material_category, m.type as material_type
            FROM orders o
            LEFT JOIN printers p ON o.printer_id = p.id
            LEFT JOIN materials m ON o.material_id = m.id
            WHERE o.user_id = $1
        `;
        const params = [userId];
        
        if (status) {
            query += ` AND o.status = $2`;
            params.push(status);
        }
        
        query += ` ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
        
        const result = await pool.query(query, params);
        return result.rows;
    }

    // Получение заказа по ID
    static async findById(id, userId) {
        const query = `
            SELECT o.*, 
                   p.name as printer_name, p.type as printer_type,
                   m.name as material_name, m.category as material_category, m.type as material_type
            FROM orders o
            LEFT JOIN printers p ON o.printer_id = p.id
            LEFT JOIN materials m ON o.material_id = m.id
            WHERE o.id = $1 AND o.user_id = $2
        `;
        const result = await pool.query(query, [id, userId]);
        return result.rows[0];
    }

    // Обновление заказа
    static async update(id, userId, orderData) {
        const {
            printer_id, material_id, name,
            model_weight_grams, support_weight_grams, total_weight_grams,
            print_time_minutes, material_cost, electricity_cost,
            depreciation_cost, labor_cost, additional_expenses,
            total_cost, margin_percent, final_price,
            notes, settings
        } = orderData;

        const query = `
            UPDATE orders 
            SET name = COALESCE($1, name),
                printer_id = COALESCE($2, printer_id),
                material_id = COALESCE($3, material_id),
                model_weight_grams = COALESCE($4, model_weight_grams),
                support_weight_grams = COALESCE($5, support_weight_grams),
                total_weight_grams = COALESCE($6, total_weight_grams),
                print_time_minutes = COALESCE($7, print_time_minutes),
                material_cost = COALESCE($8, material_cost),
                electricity_cost = COALESCE($9, electricity_cost),
                depreciation_cost = COALESCE($10, depreciation_cost),
                labor_cost = COALESCE($11, labor_cost),
                additional_expenses = COALESCE($12, additional_expenses),
                total_cost = COALESCE($13, total_cost),
                margin_percent = COALESCE($14, margin_percent),
                final_price = COALESCE($15, final_price),
                notes = COALESCE($16, notes),
                settings = settings || $17,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $18 AND user_id = $19
            RETURNING *
        `;
        const values = [
            name, printer_id, material_id,
            model_weight_grams, support_weight_grams, total_weight_grams,
            print_time_minutes, material_cost, electricity_cost,
            depreciation_cost, labor_cost, additional_expenses,
            total_cost, margin_percent, final_price,
            notes, settings, id, userId
        ];
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // Обновление статуса заказа
    static async updateStatus(id, userId, status) {
        // Проверяем допустимость статуса
        const validStatuses = ['in_progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Недопустимый статус. Допустимые значения: ${validStatuses.join(', ')}`);
        }

        // Если статус "completed", устанавливаем дату завершения
        const completed_at = status === 'completed' ? 'CURRENT_TIMESTAMP' : 'NULL';
        
        const query = `
            UPDATE orders 
            SET status = $1,
                completed_at = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND user_id = $3
            RETURNING *
        `;
        const result = await pool.query(query, [status, id, userId]);
        return result.rows[0];
    }

    // Отметить заказ как выполненный
    static async markAsCompleted(id, userId) {
        return this.updateStatus(id, userId, 'completed');
    }

    // Отметить заказ как отмененный
    static async markAsCancelled(id, userId) {
        return this.updateStatus(id, userId, 'cancelled');
    }

    // Удаление заказа
    static async delete(id, userId) {
        const query = 'DELETE FROM orders WHERE id = $1 AND user_id = $2 RETURNING id';
        const result = await pool.query(query, [id, userId]);
        return result.rows[0];
    }

    // Получение заказов по статусу
    static async findByStatus(userId, status, limit = 100) {
        const query = `
            SELECT o.*, 
                   p.name as printer_name,
                   m.name as material_name
            FROM orders o
            LEFT JOIN printers p ON o.printer_id = p.id
            LEFT JOIN materials m ON o.material_id = m.id
            WHERE o.user_id = $1 AND o.status = $2
            ORDER BY o.created_at DESC
            LIMIT $3
        `;
        const result = await pool.query(query, [userId, status, limit]);
        return result.rows;
    }

    // Получение статистики по заказам
    static async getStats(userId, period = 'all') {
        let dateFilter = '';
        const params = [userId];
        
        if (period === 'month') {
            dateFilter = "AND created_at >= date_trunc('month', CURRENT_DATE)";
        } else if (period === 'week') {
            dateFilter = "AND created_at >= date_trunc('week', CURRENT_DATE)";
        } else if (period === 'year') {
            dateFilter = "AND created_at >= date_trunc('year', CURRENT_DATE)";
        }

        const query = `
            SELECT 
                COUNT(*) as total_orders,
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_orders,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
                
                COALESCE(SUM(CASE WHEN status = 'completed' THEN final_price ELSE 0 END), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN (final_price - total_cost) ELSE 0 END), 0) as total_profit,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN total_cost ELSE 0 END), 0) as total_expenses,
                
                COALESCE(SUM(CASE WHEN status = 'completed' THEN total_weight_grams ELSE 0 END), 0) as total_filament_used,
                COALESCE(SUM(print_time_minutes), 0) as total_print_time,
                
                COALESCE(AVG(CASE WHEN status = 'completed' THEN final_price END), 0) as avg_order_value,
                MAX(final_price) as max_order_value,
                MIN(final_price) as min_order_value
                
            FROM orders
            WHERE user_id = $1
            ${dateFilter}
        `;
        
        const result = await pool.query(query, params);
        return result.rows[0];
    }

    // Получение статистики по месяцам
    static async getMonthlyStats(userId, year = null) {
        if (!year) year = new Date().getFullYear();
        
        const query = `
            SELECT 
                EXTRACT(MONTH FROM created_at) as month,
                COUNT(*) as orders_count,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN final_price ELSE 0 END), 0) as revenue,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN total_weight_grams ELSE 0 END), 0) as filament_used
            FROM orders
            WHERE user_id = $1 AND EXTRACT(YEAR FROM created_at) = $2
            GROUP BY EXTRACT(MONTH FROM created_at)
            ORDER BY month
        `;
        const result = await pool.query(query, [userId, year]);
        return result.rows;
    }

    // Получение статистики по статусам
    static async getStatusStats(userId) {
        const query = `
            SELECT 
                status,
                COUNT(*) as count,
                COALESCE(SUM(final_price), 0) as total_value,
                COALESCE(SUM(total_weight_grams), 0) as total_weight
            FROM orders
            WHERE user_id = $1
            GROUP BY status
            ORDER BY 
                CASE status
                    WHEN 'in_progress' THEN 1
                    WHEN 'completed' THEN 2
                    WHEN 'cancelled' THEN 3
                END
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    }

    // Получение последних заказов
    static async getRecentOrders(userId, limit = 10) {
        const query = `
            SELECT o.*, 
                   p.name as printer_name,
                   m.name as material_name
            FROM orders o
            LEFT JOIN printers p ON o.printer_id = p.id
            LEFT JOIN materials m ON o.material_id = m.id
            WHERE o.user_id = $1
            ORDER BY o.created_at DESC
            LIMIT $2
        `;
        const result = await pool.query(query, [userId, limit]);
        return result.rows;
    }

    // Подсчет количества заказов по статусам
    static async countByStatus(userId) {
        const query = `
            SELECT 
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
            FROM orders
            WHERE user_id = $1
        `;
        const result = await pool.query(query, [userId]);
        return result.rows[0];
    }
}

module.exports = OrderModel;