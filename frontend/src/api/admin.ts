// api/admin.ts
import api from './axios';

export interface AdminUser {
    id: string;
    username: string;
    email: string;
    avatar?: string;
    is_activated: boolean;
    role: string;
    created_at: string;
    updated_at: string;
}

export interface TableInfo {
    name: string;
    column_count: number;
    row_count: number;
}

export interface ColumnInfo {
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
}

export interface TableRowsResponse {
    rows: Record<string, unknown>[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}

export const adminAPI = {
    // ─── Users ───────────────────────────────────────────────────────────────
    getUsers: () =>
        api.get<{ users: AdminUser[] }>('/admin/users'),

    updateUser: (id: string, data: { username?: string; email?: string; is_activated?: boolean }) =>
        api.put<{ user: AdminUser }>(`/admin/users/${id}`, data),

    updateUserPassword: (id: string, password: string) =>
        api.put<{ message: string }>(`/admin/users/${id}/password`, { password }),

    deleteUser: (id: string) =>
        api.delete<{ message: string }>(`/admin/users/${id}`),

    // ─── Tables ───────────────────────────────────────────────────────────────
    getTables: () =>
        api.get<{ tables: TableInfo[] }>('/admin/tables'),

    getTableColumns: (table: string) =>
        api.get<{ columns: ColumnInfo[] }>(`/admin/tables/${table}/columns`),

    getTableRows: (table: string, params?: {
        page?: number;
        limit?: number;
        search?: string;
        searchCol?: string;
    }) =>
        api.get<TableRowsResponse>(`/admin/tables/${table}/rows`, { params }),

    createTableRow: (table: string, data: Record<string, unknown>) =>
        api.post<{ row: Record<string, unknown> }>(`/admin/tables/${table}/rows`, data),

    updateTableRow: (table: string, id: string, data: Record<string, unknown>) =>
        api.put<{ row: Record<string, unknown> }>(`/admin/tables/${table}/rows/${id}`, data),

    deleteTableRow: (table: string, id: string) =>
        api.delete<{ message: string }>(`/admin/tables/${table}/rows/${id}`),
};