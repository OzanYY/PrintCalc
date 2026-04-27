import api from "./axios";

export interface CreateOrderData {
    name: string
    printer_id: number | null
    material_id: number | null
    model_weight_grams: number
    support_weight_grams: number
    total_weight_grams: number
    print_time_minutes: number
    material_cost: number
    electricity_cost: number
    depreciation_cost: number
    labor_cost: number
    additional_expenses: number
    total_cost: number
    margin_percent: number
    final_price: number
    notes: string
    settings: Record<string, any>
}

export interface UpdateOrderData {
    name?: string
    printer_id?: number | null
    material_id?: number | null
    model_weight_grams?: number
    support_weight_grams?: number
    total_weight_grams?: number
    print_time_minutes?: number
    material_cost?: number
    electricity_cost?: number
    depreciation_cost?: number
    labor_cost?: number
    additional_expenses?: number
    total_cost?: number
    margin_percent?: number
    final_price?: number
    notes?: string
    settings?: Record<string, any>
}

export interface Order {
    id: number
    user_id: number
    printer_id: number | null
    material_id: number | null
    name: string
    status: 'in_progress' | 'completed' | 'cancelled'
    model_weight_grams: number
    support_weight_grams: number
    total_weight_grams: number
    print_time_minutes: number
    material_cost: number
    electricity_cost: number
    depreciation_cost: number
    labor_cost: number
    additional_expenses: number
    total_cost: number
    margin_percent: number
    final_price: number
    notes: string
    settings: Record<string, any>
    created_at: string
    updated_at: string
    completed_at: string | null
}

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

export interface BulkUpdateData {
    orderIds: number[]
    status: 'in_progress' | 'completed' | 'cancelled'
}

export const ordersAPI = {
    /**
     * Создание нового заказа
     */
    create: (data: CreateOrderData) => 
        api.post<{ success: boolean; data: Order; message: string }>(
            '/orders',
            data
        ),
    
    /**
     * Получение всех заказов пользователя с пагинацией и фильтрацией
     */
    getAll: (params?: { status?: string; limit?: number; page?: number }) =>
        api.get<{ success: boolean; data: Order[]; pagination: any; filters: any }>(
            '/orders',
            { params }
        ),
    
    /**
     * Получение статистики по заказам
     */
    getStats: (period?: 'all' | 'month' | 'week' | 'year') =>
        api.get<{ success: boolean; data: OrderStats; period: string }>(
            '/orders/stats',
            { params: { period } }
        ),
    
    /**
     * Получение последних заказов
     */
    getRecent: (limit?: number) =>
        api.get<{ success: boolean; data: Order[]; limit: number }>(
            '/orders/recent',
            { params: { limit } }
        ),
    
    /**
     * Экспорт заказов в CSV
     */
    exportOrders: (status?: string) =>
        api.get<Blob>(
            '/orders/export',
            { 
                params: { status },
                responseType: 'blob'
            }
        ),
    
    /**
     * Массовое обновление статусов заказов
     */
    bulkUpdateStatus: (data: BulkUpdateData) =>
        api.post<{ success: boolean; data: any; message: string }>(
            '/orders/bulk-update',
            data
        ),
    
    /**
     * Получение заказа по ID
     */
    getById: (id: number) =>
        api.get<{ success: boolean; data: Order }>(
            `/orders/${id}`
        ),
    
    /**
     * Обновление заказа
     */
    update: (id: number, data: UpdateOrderData) =>
        api.put<{ success: boolean; data: Order; message: string }>(
            `/orders/${id}`,
            data
        ),
    
    /**
     * Частичное обновление заказа
     */
    patch: (id: number, data: UpdateOrderData) =>
        api.patch<{ success: boolean; data: Order; message: string }>(
            `/orders/${id}`,
            data
        ),
    
    /**
     * Обновление статуса заказа
     */
    updateStatus: (id: number, status: string) =>
        api.patch<{ success: boolean; data: Order; message: string }>(
            `/orders/${id}/status`,
            { status }
        ),
    
    /**
     * Отметить заказ как выполненный
     */
    complete: (id: number) =>
        api.patch<{ success: boolean; data: Order; message: string }>(
            `/orders/${id}/complete`
        ),
    
    /**
     * Отменить заказ
     */
    cancel: (id: number) =>
        api.patch<{ success: boolean; data: Order; message: string }>(
            `/orders/${id}/cancel`
        ),
    
    /**
     * Удаление заказа
     */
    delete: (id: number) =>
        api.delete<{ success: boolean; message: string; deletedId: number }>(
            `/orders/${id}`
        ),
    
    /**
     * Клонирование заказа
     */
    clone: (id: number) =>
        api.post<{ success: boolean; data: Order; message: string }>(
            `/orders/${id}/clone`
        ),
    
    /**
     * Получение заказов по статусу
     */
    getByStatus: (status: string, limit?: number) =>
        api.get<{ success: boolean; data: Order[]; status: string; count: number; totalByStatus: any }>(
            `/orders/status/${status}`,
            { params: { limit } }
        ),
}

// Helper функция для скачивания CSV файла
export const downloadOrdersCSV = async (status?: string, filename?: string) => {
    try {
        const response = await ordersAPI.exportOrders(status)
        const blob = new Blob([response.data], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', filename || `orders_${Date.now()}.csv`)
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

// Helper функция для форматирования данных заказа из калькулятора
export const formatOrderDataFromCalculator = (
    results: any,
    materials: any,
    electricity: any,
    depreciation: any,
    labor: any,
    additional: any
): CreateOrderData => {
    return {
        name: `Заказ от ${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString('ru-RU')}`,
        printer_id: null,
        material_id: null,
        model_weight_grams: materials.modelWeight,
        support_weight_grams: materials.supportWeight,
        total_weight_grams: results.totalWeight.grams,
        print_time_minutes: electricity.printTime,
        material_cost: results.materials.total.value,
        electricity_cost: results.electricity.value,
        depreciation_cost: results.depreciation.value,
        labor_cost: results.labor.value,
        additional_expenses: results.additionalExpenses.value,
        total_cost: results.primeCost.value,
        margin_percent: additional.marginPercent,
        final_price: results.finalPrice.value,
        notes: `Модель: ${materials.modelWeight}г, Поддержки: ${materials.supportWeight}г, Время печати: ${electricity.printTime}мин`,
        settings: {
            model_weight: materials.modelWeight,
            support_weight: materials.supportWeight,
            filament_price: materials.filamentPrice,
            power_consumption: electricity.powerConsumption,
            electricity_price: electricity.electricityPrice,
            printer_cost: depreciation.printerCost,
            print_resource: depreciation.printResource,
            hourly_rate: labor.hourlyRate,
            work_time: labor.workTime,
            additional_expenses_percent: additional.additionalExpensesPercent
        }
    }
}