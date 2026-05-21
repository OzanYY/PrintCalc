// frontend/src/api/clients.ts
import api from './axios';

export interface Client {
    id: number;
    user_id: number;
    name: string;
    phone: string | null;
    email: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateClientData {
    name: string;
    phone?: string;
    email?: string;
    notes?: string;
}

export const clientsAPI = {
    getAll: () =>
        api.get<{ success: boolean; data: Client[] }>('/clients'),

    search: (q: string) =>
        api.get<{ success: boolean; data: Client[] }>('/clients/search', { params: { q } }),

    create: (data: CreateClientData) =>
        api.post<{ success: boolean; data: Client }>('/clients', data),

    update: (id: number, data: Partial<CreateClientData>) =>
        api.put<{ success: boolean; data: Client }>(`/clients/${id}`, data),

    delete: (id: number) =>
        api.delete<{ success: boolean; deletedId: number }>(`/clients/${id}`),
};
