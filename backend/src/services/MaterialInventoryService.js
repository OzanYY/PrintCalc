// services/MaterialInventoryService.js
const pool = require('../config/database');
const MaterialTransactionModel = require('../models/MaterialTransactionModel');

/**
 * Сервис учёта остатка материала.
 *
 * Все операции выполняются внутри переданного клиента пула (для транзакций)
 * или создают собственное соединение.
 *
 * Поля materials, которые использует этот сервис:
 *   stock_grams            — фактический остаток (граммы)
 *   reserved_grams         — сколько сейчас забронировано
 *   weight_per_spool_grams — сколько граммов в одной катушке
 *   quantity               — количество целых катушек
 *
 * available_grams = stock_grams - reserved_grams
 */
class MaterialInventoryService {

    // ─── Получить текущий инвентарь материала ────────────────────────────────

    static async getInventory(materialId, userId, client = pool) {
        const isTransaction = client !== pool;
        const lockClause = isTransaction ? 'FOR UPDATE' : '';
        const result = await client.query(
            `SELECT id, stock_grams, reserved_grams, weight_per_spool_grams, quantity, name
             FROM materials
             WHERE id = $1 AND user_id = $2
             ${lockClause}`,
            [materialId, userId]
        );
        return result.rows[0] ?? null;
    }

    // ─── Пересчитать количество катушек из граммов ────────────────────────────

    static computeSpools(stockGrams, weightPerSpool) {
        if (!weightPerSpool || weightPerSpool <= 0) return 0;
        if (stockGrams <= 0) return 0;
        return Math.ceil(stockGrams / weightPerSpool);
    }

    // ─── Обновить stock_grams + quantity в БД (внутри транзакции) ────────────

    static async #updateStock(materialId, userId, newStockGrams, newReservedGrams, weightPerSpool, client) {
        const newQty = this.computeSpools(newStockGrams, weightPerSpool);
        await client.query(
            `UPDATE materials
             SET stock_grams    = $1,
                 reserved_grams = $2,
                 quantity       = $3,
                 updated_at     = CURRENT_TIMESTAMP
             WHERE id = $4 AND user_id = $5`,
            [newStockGrams, newReservedGrams, newQty, materialId, userId]
        );
    }

    // ─── БРОНИРОВАНИЕ при создании заказа ────────────────────────────────────
    /**
     * Резервирует amountGrams из остатка материала.
     * Если не хватает — бронирует сколько есть и возвращает { warning }.
     *
     * @returns {{ transaction, warning?: string }}
     */
    static async reserve({ materialId, userId, orderId, amountGrams, note }) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const mat = await this.getInventory(materialId, userId, client);
            if (!mat) throw new Error('Материал не найден');

            const available = parseFloat(mat.stock_grams) - parseFloat(mat.reserved_grams);
            const toReserve = amountGrams;

            let warning = null;
            if (available < toReserve) {
                warning = `Недостаточно материала: нужно ${toReserve.toFixed(1)} г, доступно ${Math.max(0, available).toFixed(1)} г`;
            }

            const newReserved = parseFloat(mat.reserved_grams) + toReserve;

            await this.#updateStock(
                materialId, userId,
                parseFloat(mat.stock_grams),
                newReserved,
                parseFloat(mat.weight_per_spool_grams),
                client
            );

            const tx = await MaterialTransactionModel.create({
                user_id:        userId,
                material_id:    materialId,
                order_id:       orderId,
                type:           'reserve',
                amount_grams:   toReserve,
                balance_before: parseFloat(mat.stock_grams),
                balance_after:  parseFloat(mat.stock_grams),  // stock не меняется при брони
                note: note ?? `Бронирование для заказа #${orderId}`,
            }, client);

            await client.query('COMMIT');
            return { transaction: tx, warning };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    // ─── СНЯТИЕ БРОНИ при отмене заказа ──────────────────────────────────────

    static async release({ materialId, userId, orderId, amountGrams, note }) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const mat = await this.getInventory(materialId, userId, client);
            if (!mat) throw new Error('Материал не найден');

            const newReserved = Math.max(0, parseFloat(mat.reserved_grams) - amountGrams);

            await this.#updateStock(
                materialId, userId,
                parseFloat(mat.stock_grams),
                newReserved,
                parseFloat(mat.weight_per_spool_grams),
                client
            );

            const tx = await MaterialTransactionModel.create({
                user_id:        userId,
                material_id:    materialId,
                order_id:       orderId,
                type:           'release',
                amount_grams:   amountGrams,
                balance_before: parseFloat(mat.stock_grams),
                balance_after:  parseFloat(mat.stock_grams),
                note: note ?? `Возврат резерва по заказу #${orderId}`,
            }, client);

            await client.query('COMMIT');
            return { transaction: tx };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    // ─── СПИСАНИЕ при завершении заказа ──────────────────────────────────────

    static async consume({ materialId, userId, orderId, amountGrams, note }) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const mat = await this.getInventory(materialId, userId, client);
            if (!mat) throw new Error('Материал не найден');

            const stockBefore   = parseFloat(mat.stock_grams);
            const reservedBefore = parseFloat(mat.reserved_grams);

            // Снимаем бронь и списываем фактически
            const newStock    = Math.max(0, stockBefore - amountGrams);
            const newReserved = Math.max(0, reservedBefore - amountGrams);

            await this.#updateStock(
                materialId, userId,
                newStock,
                newReserved,
                parseFloat(mat.weight_per_spool_grams),
                client
            );

            const tx = await MaterialTransactionModel.create({
                user_id:        userId,
                material_id:    materialId,
                order_id:       orderId,
                type:           'consume',
                amount_grams:   amountGrams,
                balance_before: stockBefore,
                balance_after:  newStock,
                note: note ?? `Списание по заказу #${orderId}`,
            }, client);

            await client.query('COMMIT');
            return { transaction: tx };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    // ─── РУЧНОЕ ПОПОЛНЕНИЕ / УМЕНЬШЕНИЕ (добавить катушки) ───────────────────

    static async manualAdjust({ materialId, userId, amountGrams, isAdd, note }) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const mat = await this.getInventory(materialId, userId, client);
            if (!mat) throw new Error('Материал не найден');

            const stockBefore = parseFloat(mat.stock_grams);
            const newStock = isAdd
                ? stockBefore + amountGrams
                : Math.max(0, stockBefore - amountGrams);

            await this.#updateStock(
                materialId, userId,
                newStock,
                parseFloat(mat.reserved_grams),
                parseFloat(mat.weight_per_spool_grams),
                client
            );

            const tx = await MaterialTransactionModel.create({
                user_id:        userId,
                material_id:    materialId,
                order_id:       null,
                type:           isAdd ? 'manual_add' : 'manual_sub',
                amount_grams:   amountGrams,
                balance_before: stockBefore,
                balance_after:  newStock,
                note: note ?? (isAdd ? 'Ручное пополнение' : 'Ручное списание'),
            }, client);

            await client.query('COMMIT');
            return { transaction: tx, newStock };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    // ─── Найти бронь по заказу (для снятия / списания) ───────────────────────
    // Возвращает сумму граммов, зарезервированных для данного заказа

    static async getReservedForOrder(orderId, materialId, userId) {
        const result = await pool.query(
            `SELECT COALESCE(SUM(amount_grams), 0) AS reserved
             FROM material_transactions
             WHERE order_id = $1 AND material_id = $2 AND user_id = $3 AND type = 'reserve'`,
            [orderId, materialId, userId]
        );
        return parseFloat(result.rows[0].reserved);
    }

    // ─── История транзакций ───────────────────────────────────────────────────

    static async getTransactionsByMaterial(materialId, userId, limit = 50, offset = 0) {
        return MaterialTransactionModel.findByMaterial(materialId, userId, limit, offset);
    }

    static async getTransactionsByOrder(orderId, userId) {
        return MaterialTransactionModel.findByOrder(orderId, userId);
    }

    static async getAllTransactions(userId, limit = 100, offset = 0) {
        return MaterialTransactionModel.findByUser(userId, limit, offset);
    }
}

module.exports = MaterialInventoryService;