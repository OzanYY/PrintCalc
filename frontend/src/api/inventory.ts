// api/inventory.ts
import api from './axios'

export type TransactionType = 'reserve' | 'release' | 'consume' | 'manual_add' | 'manual_sub'

export interface MaterialTransaction {
    id: number
    user_id: number
    material_id: number
    order_id: number | null
    type: TransactionType
    amount_grams: number
    balance_before: number
    balance_after: number
    note: string | null
    created_at: string
    // JOIN fields
    material_name?: string
    order_name?: string
}

export const inventoryAPI = {
    /** Все транзакции пользователя */
    getAll: (params?: { limit?: number; page?: number }) =>
        api.get<{ success: boolean; data: MaterialTransaction[] }>('/inventory/transactions', { params }),

    /** История по материалу */
    getByMaterial: (materialId: number, params?: { limit?: number; page?: number }) =>
        api.get<{ success: boolean; data: MaterialTransaction[] }>(
            `/inventory/materials/${materialId}/transactions`, { params }
        ),

    /** История по заказу */
    getByOrder: (orderId: number) =>
        api.get<{ success: boolean; data: MaterialTransaction[] }>(
            `/inventory/orders/${orderId}/transactions`
        ),

    /** Ручная корректировка: добавить/убрать граммы или катушки */
    adjust: (materialId: number, data: {
        amount_grams?: number
        spools?: number
        is_add: boolean
        note?: string
    }) =>
        api.post<{ success: boolean; data: unknown; message: string }>(
            `/inventory/materials/${materialId}/adjust`, data
        ),

    /** Обновить вес катушки */
    updateSpoolWeight: (materialId: number, weight_per_spool_grams: number) =>
        api.patch<{ success: boolean; data: unknown; message: string }>(
            `/inventory/materials/${materialId}/spool-weight`, { weight_per_spool_grams }
        ),
}

export const TX_LABELS: Record<TransactionType, string> = {
    reserve:    'Бронирование',
    release:    'Возврат',
    consume:    'Списание',
    manual_add: 'Пополнение',
    manual_sub: 'Ручное списание',
}

export const TX_COLORS: Record<TransactionType, string> = {
    reserve:    'text-yellow-600 dark:text-yellow-400',
    release:    'text-blue-600 dark:text-blue-400',
    consume:    'text-red-600 dark:text-red-400',
    manual_add: 'text-green-600 dark:text-green-400',
    manual_sub: 'text-orange-600 dark:text-orange-400',
}

export const TX_SIGN: Record<TransactionType, string> = {
    reserve:    '🔒',
    release:    '🔓',
    consume:    '📉',
    manual_add: '📦',
    manual_sub: '➖',
}