// frontend/src/api/orderComments.ts
import api from './axios';

export interface OrderComment {
    id: number;
    order_id: number;
    user_id: number;
    author_name: string;
    body: string;
    created_at: string;
    updated_at: string;
}

export const orderCommentsAPI = {
    getAll: (orderId: number) =>
        api.get<{ success: boolean; data: OrderComment[] }>(`/orders/${orderId}/comments`),

    create: (orderId: number, body: string) =>
        api.post<{ success: boolean; data: OrderComment }>(`/orders/${orderId}/comments`, { body }),

    update: (orderId: number, commentId: number, body: string) =>
        api.put<{ success: boolean; data: OrderComment }>(
            `/orders/${orderId}/comments/${commentId}`,
            { body }
        ),

    delete: (orderId: number, commentId: number) =>
        api.delete<{ success: boolean; deletedId: number }>(
            `/orders/${orderId}/comments/${commentId}`
        ),
};
