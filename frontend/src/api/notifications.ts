import api from './axios';

export interface AppNotification {
    id: number;
    user_id: number;
    type: NotificationType;
    data: Record<string, any>;
    is_read: boolean;
    created_at: string;
}

export type NotificationType =
    | 'team_invitation'
    | 'invitation_accepted'
    | 'invitation_declined'
    | 'member_joined'
    | 'member_left'
    | 'member_removed'
    | 'role_changed'
    | 'order_assigned';

export const notificationsAPI = {
    getAll: (params?: { limit?: number; offset?: number }) =>
        api.get<{ data: AppNotification[] }>('/notifications', { params }),

    getUnreadCount: () =>
        api.get<{ count: number }>('/notifications/unread-count'),

    markRead: (id: number) =>
        api.patch<{ data: AppNotification }>(`/notifications/${id}/read`),

    markAllRead: () =>
        api.patch<{ message: string }>('/notifications/read-all'),

    deleteOne: (id: number) =>
        api.delete<{ message: string }>(`/notifications/${id}`),
};
