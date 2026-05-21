// frontend/src/api/tags.ts
import api from './axios';

export interface Tag {
    id: number;
    user_id: number;
    name: string;
    color: string;       // HEX, например '#6366f1'
    orders_count?: number;
}

export interface CreateTagData {
    name: string;
    color?: string;
}

export const tagsAPI = {
    getAll: () =>
        api.get<{ success: boolean; data: Tag[] }>('/tags'),

    create: (data: CreateTagData) =>
        api.post<{ success: boolean; data: Tag }>('/tags', data),

    update: (id: number, data: Partial<CreateTagData>) =>
        api.put<{ success: boolean; data: Tag }>(`/tags/${id}`, data),

    delete: (id: number) =>
        api.delete<{ success: boolean; deletedId: number }>(`/tags/${id}`),

    // ─── Теги конкретного заказа ────────────────────────────
    getOrderTags: (orderId: number) =>
        api.get<{ success: boolean; data: Tag[] }>(`/orders/${orderId}/tags`),

    /** Полная замена тегов заказа */
    setOrderTags: (orderId: number, tagIds: number[]) =>
        api.put<{ success: boolean; data: Tag[] }>(`/orders/${orderId}/tags`, { tagIds }),

    addOrderTag: (orderId: number, tagId: number) =>
        api.post<{ success: boolean; data: Tag[] }>(`/orders/${orderId}/tags/${tagId}`),

    removeOrderTag: (orderId: number, tagId: number) =>
        api.delete<{ success: boolean; data: Tag[] }>(`/orders/${orderId}/tags/${tagId}`),
};
