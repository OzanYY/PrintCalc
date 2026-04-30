// api/materials.ts
import api from "./axios";

// ─── Константы ────────────────────────────────────────────────────────────────

export const MATERIAL_CATEGORIES = ['filament', 'resin', 'powder', 'other'] as const;
export type MaterialCategory = typeof MATERIAL_CATEGORIES[number];

export const MATERIAL_TYPES: Record<MaterialCategory, string[]> = {
    filament: ['pla', 'abs', 'petg', 'tpu', 'nylon', 'pc', 'peek', 'pva', 'hips', 'asa', 'pp', 'carbon', 'wood', 'metal', 'glow', 'other'],
    resin:    ['standard', 'tough', 'flexible', 'castable', 'dental', 'jewelry', 'transparent', 'colored', 'engineering', 'other'],
    powder:   ['nylon', 'alumide', 'steel', 'titanium', 'aluminum', 'other'],
    other:    ['wax', 'paper', 'ceramic', 'other'],
};

export const CATEGORY_LABELS: Record<MaterialCategory, string> = {
    filament: 'Филамент',
    resin:    'Смола',
    powder:   'Порошок',
    other:    'Другое',
};

// ─── Типы ─────────────────────────────────────────────────────────────────────

export interface Material {
    id: number
    user_id: number
    name: string
    category: MaterialCategory
    type: string
    brand: string | null
    color: string | null
    price_per_kg: number
    density: number | null
    diameter: number | null
    is_default: boolean
    settings: Record<string, string>
    created_at: string
    updated_at: string
}

export interface CreateMaterialData {
    name: string
    category: MaterialCategory
    type: string
    brand?: string
    color?: string
    price_per_kg: number
    density?: number
    diameter?: number
    is_default?: boolean
    settings?: Record<string, string>
}

export interface UpdateMaterialData {
    name?: string
    category?: MaterialCategory
    type?: string
    brand?: string
    color?: string
    price_per_kg?: number
    density?: number
    diameter?: number
    is_default?: boolean
    settings?: Record<string, string>
}

export interface MaterialStats {
    total: string
    filament_count: string
    resin_count: string
    powder_count: string
    other_count: string
    default_count: string
    avg_filament_price: string | null
    avg_resin_price: string | null
    most_common_type: string | null
    min_price: string
    max_price: string
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const materialsAPI = {
    /** Все материалы пользователя (query: ?category=...) */
    getAll: (category?: MaterialCategory) =>
        api.get<{ success: boolean; data: Material[] }>('/materials', {
            params: category ? { category } : undefined,
        }),

    /** Материал по ID */
    getById: (id: number) =>
        api.get<{ success: boolean; data: Material }>(`/materials/${id}`),

    /** Материал по умолчанию (query: ?category=...) */
    getDefault: (category?: MaterialCategory) =>
        api.get<{ success: boolean; data: Material | null }>('/materials/default', {
            params: category ? { category } : undefined,
        }),

    /** Материалы по категории */
    getByCategory: (category: MaterialCategory) =>
        api.get<{ success: boolean; data: Material[] }>(`/materials/category/${category}`),

    /** Доступные типы для категории */
    getTypesByCategory: (category: MaterialCategory) =>
        api.get<{ success: boolean; data: string[] }>(`/materials/types/${category}`),

    /** Поиск по названию, бренду, типу */
    search: (q: string) =>
        api.get<{ success: boolean; data: Material[] }>('/materials/search', { params: { q } }),

    /** Статистика */
    getStats: () =>
        api.get<{ success: boolean; data: MaterialStats }>('/materials/stats'),

    /** Создать материал */
    create: (data: CreateMaterialData) =>
        api.post<{ success: boolean; data: Material; message: string }>('/materials', data),

    /** Обновить материал */
    update: (id: number, data: UpdateMaterialData) =>
        api.put<{ success: boolean; data: Material; message: string }>(`/materials/${id}`, data),

    /** Установить по умолчанию */
    setDefault: (id: number) =>
        api.patch<{ success: boolean; data: Material; message: string }>(`/materials/${id}/default`),

    /** Дублировать материал */
    duplicate: (id: number, name?: string) =>
        api.post<{ success: boolean; data: Material; message: string }>(`/materials/${id}/duplicate`, { name }),

    /** Удалить материал */
    delete: (id: number) =>
        api.delete<{ success: boolean; message: string }>(`/materials/${id}`),
};