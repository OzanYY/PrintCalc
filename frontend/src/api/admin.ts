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

export interface AdminTeam {
    id: number;
    name: string;
    description: string | null;
    owner_id: number;
    owner_name: string | null;
    owner_avatar: string | null;
    member_count: number;
    created_at: string;
    updated_at: string;
}

export interface AdminTeamMember {
    team_id: number;
    user_id: number;
    role: 'owner' | 'admin' | 'member';
    merge_stats_with_personal: boolean;
    joined_at: string;
    username: string;
    email: string;
    avatar: string | null;
    is_activated: boolean;
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

    updateUser: (id: string, data: { username?: string; email?: string; is_activated?: boolean; role?: string }) =>
        api.put<{ user: AdminUser }>(`/admin/users/${id}`, data),

    // ─── Teams ───────────────────────────────────────────────────────────────
    getTeams: (params?: { page?: number; limit?: number; search?: string }) =>
        api.get<{ teams: AdminTeam[]; total: number; page: number; pages: number; limit: number }>('/admin/teams', { params }),

    updateTeam: (id: number, data: { name: string; description?: string | null }) =>
        api.patch<{ team: AdminTeam }>(`/admin/teams/${id}`, data),

    deleteTeam: (id: number) =>
        api.delete<{ message: string }>(`/admin/teams/${id}`),

    getTeamMembers: (id: number) =>
        api.get<{ members: AdminTeamMember[] }>(`/admin/teams/${id}/members`),

    addTeamMember: (id: number, data: { user_id: string; role?: string }) =>
        api.post<{ member: AdminTeamMember }>(`/admin/teams/${id}/members`, data),

    updateTeamMember: (id: number, userId: number, role: string) =>
        api.patch<{ member: AdminTeamMember }>(`/admin/teams/${id}/members/${userId}`, { role }),

    removeTeamMember: (id: number, userId: number) =>
        api.delete<{ message: string }>(`/admin/teams/${id}/members/${userId}`),

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