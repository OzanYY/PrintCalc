import api from "./axios";
import type { CalculationResult } from "@/api/calculator";

// ─── Параметры калькулятора ───────────────────────────────────────────────────

export interface CalcMaterials {
    modelWeight: number
    supportWeight: number
    filamentPrice: number
}

export interface CalcElectricity {
    powerConsumption: number
    printTime: number
    electricityPrice: number
}

export interface CalcDepreciation {
    printerCost: number
    printResource: number
}

export interface CalcLabor {
    hourlyRate: number
    workTime: number
}

export interface CalcAdditional {
    additionalExpensesPercent: number
    marginPercent: number
}

// ─── Интерфейсы заказа ────────────────────────────────────────────────────────

export interface Order {
    id: number
    user_id: number
    printer_id: number | null
    material_id: number | null
    name: string
    status: 'in_progress' | 'completed' | 'cancelled'

    // Параметры калькулятора
    calc_materials: CalcMaterials
    calc_electricity: CalcElectricity
    calc_depreciation: CalcDepreciation
    calc_labor: CalcLabor
    calc_additional: CalcAdditional

    // Результат расчёта
    calc_result: CalculationResult

    // Денормализованные поля (read-only, заполняются триггером на сервере)
    total_weight_grams: number
    print_time_minutes: number
    total_cost: number
    margin_percent: number
    final_price: number

    notes: string | null
    settings: Record<string, unknown>

    created_at: string
    updated_at: string
    completed_at: string | null

    // JOIN-поля (присутствуют в большинстве запросов)
    printer_name?: string | null
    printer_type?: string | null
    material_name?: string | null
    material_category?: string | null
    material_type?: string | null
}

export interface CreateOrderData {
    name: string
    printer_id?: number | null
    material_id?: number | null
    calc_materials: CalcMaterials
    calc_electricity: CalcElectricity
    calc_depreciation: CalcDepreciation
    calc_labor: CalcLabor
    calc_additional: CalcAdditional
    calc_result: CalculationResult
    notes?: string
    settings?: Record<string, unknown>
}

// При обновлении все поля опциональны.
// Если передаёшь любой calc_* параметр — передавай и calc_result,
// иначе сервер вернёт ошибку валидации.
export interface UpdateOrderData {
    name?: string
    printer_id?: number | null
    material_id?: number | null
    calc_materials?: Partial<CalcMaterials>
    calc_electricity?: Partial<CalcElectricity>
    calc_depreciation?: Partial<CalcDepreciation>
    calc_labor?: Partial<CalcLabor>
    calc_additional?: Partial<CalcAdditional>
    calc_result?: CalculationResult
    notes?: string
    settings?: Record<string, unknown>
}

// ─── Статистика ───────────────────────────────────────────────────────────────

export interface OrderStats {
    total_orders: string
    in_progress_orders: string
    completed_orders: string
    cancelled_orders: string
    total_revenue: string
    total_profit: string
    total_expenses: string
    total_filament_used: string
    total_print_time: string
    avg_order_value: string
    max_order_value: string
    min_order_value: string
}

export interface OrderStatsResponse {
    summary: OrderStats
    by_status: Array<{
        status: string
        count: string
        total_value: string
        total_weight: string
    }>
    monthly: Array<{
        month: number
        orders_count: string
        completed_count: string
        cancelled_count: string
        revenue: string
        filament_used: string
    }>
    analytics: {
        conversion_rate: string
        average_profit_margin: string
        average_cost_per_gram: string
    }
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const ordersAPI = {
    /**
     * Создание нового заказа.
     * calc_result обязателен — передавай результат из калькулятора как есть.
     */
    create: (data: CreateOrderData) =>
        api.post<{ success: boolean; data: Order; message: string }>(
            '/orders',
            data
        ),

    /**
     * Список заказов с пагинацией и опциональным фильтром по статусу.
     */
    getAll: (params?: { status?: 'in_progress' | 'completed' | 'cancelled'; limit?: number; page?: number }) =>
        api.get<{ success: boolean; data: Order[]; pagination: { limit: number; offset: number; total: number }; filters: { status: string | null } }>(
            '/orders',
            { params }
        ),

    /**
     * Заказ по ID.
     */
    getById: (id: number) =>
        api.get<{ success: boolean; data: Order }>(
            `/orders/${id}`
        ),

    /**
     * Обновление заказа.
     * Если меняешь calc_* параметры — обязательно передай актуальный calc_result.
     */
    update: (id: number, data: UpdateOrderData) =>
        api.put<{ success: boolean; data: Order; message: string }>(
            `/orders/${id}`,
            data
        ),

    /**
     * Смена статуса заказа.
     */
    updateStatus: (id: number, status: 'in_progress' | 'completed' | 'cancelled') =>
        api.patch<{ success: boolean; data: Order; message: string }>(
            `/orders/${id}/status`,
            { status }
        ),

    /**
     * Пометить заказ как выполненный.
     */
    complete: (id: number) =>
        api.patch<{ success: boolean; data: Order; message: string }>(
            `/orders/${id}/complete`
        ),

    /**
     * Отменить заказ.
     */
    cancel: (id: number) =>
        api.patch<{ success: boolean; data: Order; message: string }>(
            `/orders/${id}/cancel`
        ),

    /**
     * Удаление заказа (только in_progress и cancelled).
     */
    delete: (id: number) =>
        api.delete<{ success: boolean; message: string; deletedId: number }>(
            `/orders/${id}`
        ),

    /**
     * Клонирование заказа — создаёт копию с теми же параметрами и calc_result.
     */
    clone: (id: number) =>
        api.post<{ success: boolean; data: Order; message: string }>(
            `/orders/${id}/clone`
        ),

    /**
     * Заказы по статусу.
     */
    getByStatus: (status: 'in_progress' | 'completed' | 'cancelled', limit?: number) =>
        api.get<{ success: boolean; data: Order[]; status: string; count: number; totalByStatus: Record<string, string> }>(
            `/orders/status/${status}`,
            { params: { limit } }
        ),

    /**
     * Последние N заказов.
     */
    getRecent: (limit?: number) =>
        api.get<{ success: boolean; data: Order[]; limit: number }>(
            '/orders/recent',
            { params: { limit } }
        ),

    /**
     * Сводная статистика. period: 'all' | 'week' | 'month' | 'year'
     */
    getStats: (period?: 'all' | 'week' | 'month' | 'year') =>
        api.get<{ success: boolean; data: OrderStatsResponse; period: string }>(
            '/orders/stats',
            { params: { period } }
        ),

    /**
     * Массовое обновление статуса.
     */
    bulkUpdateStatus: (orderIds: number[], status: 'in_progress' | 'completed' | 'cancelled') =>
        api.patch<{ success: boolean; data: any; message: string }>(
            '/orders/bulk-status',
            { orderIds, status }
        ),

    /**
     * Экспорт в CSV.
     */
    exportCSV: (status?: 'in_progress' | 'completed' | 'cancelled') =>
        api.get<Blob>(
            '/orders/export',
            { params: { status }, responseType: 'blob' }
        ),
}

// ─── Хелперы ──────────────────────────────────────────────────────────────────

/**
 * Скачивает CSV-файл с заказами через браузер.
 */
export const downloadOrdersCSV = async (
    status?: 'in_progress' | 'completed' | 'cancelled',
    filename?: string
): Promise<{ success: boolean; error?: unknown }> => {
    try {
        const response = await ordersAPI.exportCSV(status)
        const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
        const url  = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href  = url
        link.setAttribute('download', filename ?? `orders_${Date.now()}.csv`)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
        return { success: true }
    } catch (error) {
        console.error('Error downloading CSV:', error)
        return { success: false, error }
    }
}

/**
 * Формирует CreateOrderData из состояния калькулятора.
 * Принимает те же объекты, которые хранятся в CalculatorContext.
 */
export const buildCreateOrderData = (
    name: string,
    calcResult: CalculationResult,
    materials: CalcMaterials,
    electricity: CalcElectricity,
    depreciation: CalcDepreciation,
    labor: CalcLabor,
    additional: CalcAdditional,
    options?: {
        printer_id?: number | null
        material_id?: number | null
        notes?: string
        settings?: Record<string, unknown>
    }
): CreateOrderData => ({
    name,
    printer_id:  options?.printer_id  ?? null,
    material_id: options?.material_id ?? null,
    calc_materials:    materials,
    calc_electricity:  electricity,
    calc_depreciation: depreciation,
    calc_labor:        labor,
    calc_additional:   additional,
    calc_result:       calcResult,
    notes:    options?.notes,
    settings: options?.settings,
})