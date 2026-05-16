import api from "./axios";

// ─── Типы ─────────────────────────────────────────────────────────────────────

export const PRINTER_TYPES = ['FDM', 'SLA', 'SLS', 'PolyJet'] as const;
export type PrinterType = typeof PRINTER_TYPES[number];

export interface Printer {
    id: number
    user_id: number
    name: string
    type: PrinterType
    model: string | null
    purchase_price: number
    print_lifetime_hours: number
    power_consumption: number
    is_default: boolean
    settings: Record<string, string>
    created_at: string
    updated_at: string
}

export interface CreatePrinterData {
    name: string
    type: PrinterType
    model?: string
    purchase_price?: number
    print_lifetime_hours?: number
    power_consumption?: number
    is_default?: boolean
    settings?: Record<string, string>
}

export interface UpdatePrinterData {
    name?: string
    type?: PrinterType
    model?: string
    purchase_price?: number
    print_lifetime_hours?: number
    power_consumption?: number
    is_default?: boolean
    settings?: Record<string, string>
}

export interface PrinterStats {
    total: string
    fdm_count: string
    sla_count: string
    sls_count: string
    polyjet_count: string
    default_count: string
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const printersAPI = {
    /** Все принтеры пользователя */
    getAll: () =>
        api.get<{ success: boolean; data: Printer[] }>('/printers'),

    /** Принтер по ID */
    getById: (id: number) =>
        api.get<{ success: boolean; data: Printer }>(`/printers/${id}`),

    /** Принтер по умолчанию */
    getDefault: () =>
        api.get<{ success: boolean; data: Printer | null }>('/printers/default'),

    /** Список принтеров по типу */
    getByType: (type: PrinterType) =>
        api.get<{ success: boolean; data: Printer[] }>(`/printers/type/${type}`),

    /** Статистика */
    getStats: () =>
        api.get<{ success: boolean; data: PrinterStats }>('/printers/stats'),

    /** Создать принтер */
    create: (data: CreatePrinterData) =>
        api.post<{ success: boolean; data: Printer; message: string }>('/printers', data),

    /** Обновить принтер */
    update: (id: number, data: UpdatePrinterData) =>
        api.put<{ success: boolean; data: Printer; message: string }>(`/printers/${id}`, data),

    /** Установить принтер по умолчанию */
    setDefault: (id: number) =>
        api.patch<{ success: boolean; data: Printer; message: string }>(`/printers/${id}/default`),

    /** Удалить принтер */
    delete: (id: number) =>
        api.delete<{ success: boolean; message: string }>(`/printers/${id}`),
}