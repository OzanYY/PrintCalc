// models/MaterialModel.js
const pool = require('../config/database');

class MaterialModel {
    // Создание таблицы материалов
    static async createTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS materials (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                category VARCHAR(50) NOT NULL CHECK (category IN ('filament', 'resin', 'powder', 'other')),
                type VARCHAR(50) NOT NULL,
                brand VARCHAR(100),
                color VARCHAR(50),
                price_per_kg DECIMAL(10,2) NOT NULL DEFAULT 0,
                density DECIMAL(10,3),
                diameter DECIMAL(5,2),
                is_default BOOLEAN DEFAULT false,
                settings JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_materials_user_id ON materials(user_id);
            CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);
            CREATE INDEX IF NOT EXISTS idx_materials_type ON materials(type);
            CREATE INDEX IF NOT EXISTS idx_materials_default ON materials(user_id, is_default);
        `;
        await pool.query(query);
    }

    // Валидация типа материала в зависимости от категории
    static validateType(category, type) {
        const validTypes = {
            filament: ['pla', 'abs', 'petg', 'tpu', 'nylon', 'pc', 'peek', 'pva', 'hips', 'asa', 'pp', 'carbon', 'wood', 'metal', 'glow', 'other'],
            resin: ['standard', 'tough', 'flexible', 'castable', 'dental', 'jewelry', 'transparent', 'colored', 'engineering', 'other'],
            powder: ['nylon', 'alumide', 'steel', 'titanium', 'aluminum', 'other'],
            other: ['wax', 'paper', 'ceramic', 'other']
        };

        if (!validTypes[category]) {
            throw new Error(`Invalid category: ${category}`);
        }

        if (!validTypes[category].includes(type)) {
            throw new Error(`Invalid type '${type}' for category '${category}'. Allowed types: ${validTypes[category].join(', ')}`);
        }

        return true;
    }

    // Создание материала
    static async create(userId, materialData) {
        const { 
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
        } = materialData;

        // Валидируем тип материала
        this.validateType(category, type);

        // Если этот материал делаем по умолчанию, сбрасываем флаг у других
        if (is_default) {
            await pool.query(
                'UPDATE materials SET is_default = false WHERE user_id = $1',
                [userId]
            );
        }

        // Для смол и порохов диаметр не нужен
        let finalDiameter = diameter;
        if (category !== 'filament') {
            finalDiameter = null;
        }

        const query = `
            INSERT INTO materials (
                user_id, name, category, type, brand, color, 
                price_per_kg, density, diameter, is_default, settings
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;
        const values = [
            userId, name, category, type, brand, color, 
            price_per_kg || 0, density || null, finalDiameter, 
            is_default || false, settings || {}
        ];
        
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // Получение всех материалов пользователя
    static async findByUser(userId, category = null) {
        let query = 'SELECT * FROM materials WHERE user_id = $1';
        const params = [userId];
        
        if (category) {
            query += ' AND category = $2';
            params.push(category);
        }
        
        query += ' ORDER BY is_default DESC, created_at DESC';
        
        const result = await pool.query(query, params);
        return result.rows;
    }

    // Получение материала по ID
    static async findById(id, userId) {
        const query = 'SELECT * FROM materials WHERE id = $1 AND user_id = $2';
        const result = await pool.query(query, [id, userId]);
        return result.rows[0];
    }

    // Получение материала по умолчанию для конкретной категории
    static async findDefault(userId, category = null) {
        let query = 'SELECT * FROM materials WHERE user_id = $1 AND is_default = true';
        const params = [userId];
        
        if (category) {
            query += ' AND category = $2';
            params.push(category);
        }
        
        query += ' LIMIT 1';
        
        const result = await pool.query(query, params);
        return result.rows[0] || null;
    }

    // Получение материалов по категории
    static async findByCategory(userId, category) {
        const query = 'SELECT * FROM materials WHERE user_id = $1 AND category = $2 ORDER BY type, name';
        const result = await pool.query(query, [userId, category]);
        return result.rows;
    }

    // Получение материалов по типу
    static async findByType(userId, type) {
        const query = 'SELECT * FROM materials WHERE user_id = $1 AND type = $2 ORDER BY name';
        const result = await pool.query(query, [userId, type]);
        return result.rows;
    }

    // Обновление материала
    static async update(id, userId, materialData) {
        const { 
            name, category, type, brand, color, 
            price_per_kg, density, diameter, is_default, settings 
        } = materialData;

        // Если категория или тип меняются, проверяем их
        if (category && type) {
            this.validateType(category, type);
        } else if (category) {
            // Получаем текущий материал, чтобы проверить тип
            const current = await this.findById(id, userId);
            if (current) {
                this.validateType(category, current.type);
            }
        } else if (type) {
            const current = await this.findById(id, userId);
            if (current) {
                this.validateType(current.category, type);
            }
        }

        // Если этот материал делаем по умолчанию, сбрасываем флаг у других
        if (is_default) {
            await pool.query(
                'UPDATE materials SET is_default = false WHERE user_id = $1',
                [userId]
            );
        }

        const query = `
            UPDATE materials 
            SET name = COALESCE($1, name),
                category = COALESCE($2, category),
                type = COALESCE($3, type),
                brand = COALESCE($4, brand),
                color = COALESCE($5, color),
                price_per_kg = COALESCE($6, price_per_kg),
                density = COALESCE($7, density),
                diameter = CASE 
                    WHEN $8 IS NOT NULL AND category = 'filament' THEN $8
                    WHEN $8 IS NULL AND category = 'filament' THEN diameter
                    ELSE NULL 
                END,
                is_default = COALESCE($9, is_default),
                settings = settings || $10,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $11 AND user_id = $12
            RETURNING *
        `;
        const values = [
            name, category, type, brand, color, 
            price_per_kg, density, diameter, is_default, 
            settings, id, userId
        ];
        
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // Удаление материала
    static async delete(id, userId) {
        const query = 'DELETE FROM materials WHERE id = $1 AND user_id = $2 RETURNING id';
        const result = await pool.query(query, [id, userId]);
        return result.rows[0];
    }

    // Сделать материал основным для его категории
    static async setDefault(id, userId) {
        // Сначала получаем материал, чтобы узнать его категорию
        const material = await this.findById(id, userId);
        if (!material) {
            return null;
        }

        // Сбрасываем default для всех материалов пользователя этой категории
        await pool.query(
            'UPDATE materials SET is_default = false WHERE user_id = $1 AND category = $2',
            [userId, material.category]
        );
        
        // Устанавливаем новый default
        const query = 'UPDATE materials SET is_default = true WHERE id = $1 AND user_id = $2 RETURNING *';
        const result = await pool.query(query, [id, userId]);
        return result.rows[0];
    }

    // Получение статистики по материалам
    static async getUserStats(userId) {
        const query = `
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN category = 'filament' THEN 1 END) as filament_count,
                COUNT(CASE WHEN category = 'resin' THEN 1 END) as resin_count,
                COUNT(CASE WHEN category = 'powder' THEN 1 END) as powder_count,
                COUNT(CASE WHEN category = 'other' THEN 1 END) as other_count,
                COUNT(CASE WHEN is_default THEN 1 END) as default_count,
                
                -- Средние цены по категориям
                AVG(CASE WHEN category = 'filament' THEN price_per_kg END) as avg_filament_price,
                AVG(CASE WHEN category = 'resin' THEN price_per_kg END) as avg_resin_price,
                
                -- Самые популярные типы
                mode() WITHIN GROUP (ORDER BY type) as most_common_type,
                
                -- Минимальная и максимальная цена
                MIN(price_per_kg) as min_price,
                MAX(price_per_kg) as max_price
                
            FROM materials 
            WHERE user_id = $1
        `;
        const result = await pool.query(query, [userId]);
        return result.rows[0];
    }

    // Получение доступных типов для категории (для UI)
    static getTypesByCategory(category) {
        const types = {
            filament: ['pla', 'abs', 'petg', 'tpu', 'nylon', 'pc', 'peek', 'pva', 'hips', 'asa', 'pp', 'carbon', 'wood', 'metal', 'glow', 'other'],
            resin: ['standard', 'tough', 'flexible', 'castable', 'dental', 'jewelry', 'transparent', 'colored', 'engineering', 'other'],
            powder: ['nylon', 'alumide', 'steel', 'titanium', 'aluminum', 'other'],
            other: ['wax', 'paper', 'ceramic', 'other']
        };
        
        return types[category] || [];
    }

    // Поиск материалов по названию или бренду
    static async search(userId, searchTerm) {
        const query = `
            SELECT * FROM materials 
            WHERE user_id = $1 
            AND (name ILIKE $2 OR brand ILIKE $2 OR type ILIKE $2)
            ORDER BY is_default DESC, created_at DESC
        `;
        const result = await pool.query(query, [userId, `%${searchTerm}%`]);
        return result.rows;
    }

    // Копирование материала (для создания похожего)
    static async duplicate(id, userId, newName) {
        const material = await this.findById(id, userId);
        if (!material) {
            return null;
        }

        const newMaterial = {
            ...material,
            name: newName || `${material.name} (копия)`,
            is_default: false
        };
        
        delete newMaterial.id;
        delete newMaterial.created_at;
        delete newMaterial.updated_at;

        return this.create(userId, newMaterial);
    }
}

module.exports = MaterialModel;