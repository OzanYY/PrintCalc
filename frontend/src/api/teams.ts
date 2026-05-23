import api from './axios';
import type { Order } from './orders';

export interface Team {
    id: number;
    name: string;
    description: string | null;
    owner_id: number;
    owner_name: string;
    owner_avatar: string | null;
    avatar: string | null;
    member_count: number;
    role?: 'owner' | 'admin' | 'member';
    joined_at?: string;
    merge_stats_with_personal?: boolean;
    created_at: string;
    updated_at: string;
}

export interface TeamMember {
    team_id: number;
    user_id: number;
    role: 'owner' | 'admin' | 'member';
    merge_stats_with_personal: boolean;
    joined_at: string;
    username: string;
    email: string;
    avatar: string | null;
}

export interface TeamInvitation {
    id: number;
    team_id: number;
    team_name: string;
    team_avatar: string | null;
    inviter_id: number;
    inviter_name: string;
    inviter_avatar: string | null;
    invitee_id: number | null;
    invitee_name: string | null;
    invitee_email: string | null;
    message: string | null;
    status: 'pending' | 'accepted' | 'declined' | 'cancelled';
    member_count: number;
    created_at: string;
    expires_at: string;
}

export interface TeamResource {
    team_id: number;
    user_id: number;
    resource_type: 'printer' | 'material';
    resource_id: number;
    shared_at: string;
}

export interface TeamStats {
    printers: number;
    materials: number;
    total_orders: number;
    completed_orders: number;
    total_profit: number;
}

export interface MemberStat {
    id: number;
    username: string;
    avatar: string | null;
    role: string;
    total_orders: number;
    completed_orders: number;
    total_profit: number;
}

export const teamsAPI = {
    // ─── Команды ─────────────────────────────────────────────────────────────
    getMyTeams: () =>
        api.get<{ data: Team[] }>('/teams'),

    createTeam: (data: { name: string; description?: string }) =>
        api.post<{ data: Team }>('/teams', data),

    getTeam: (id: number) =>
        api.get<{ data: Team }>(`/teams/${id}`),

    updateTeam: (id: number, data: { name?: string; description?: string }) =>
        api.patch<{ data: Team }>(`/teams/${id}`, data),

    deleteTeam: (id: number) =>
        api.delete<{ message: string }>(`/teams/${id}`),

    // ─── Участники ───────────────────────────────────────────────────────────
    getMembers: (teamId: number) =>
        api.get<{ data: TeamMember[] }>(`/teams/${teamId}/members`),

    updateMemberRole: (teamId: number, userId: number, role: 'admin' | 'member') =>
        api.patch<{ data: TeamMember }>(`/teams/${teamId}/members/${userId}`, { role }),

    removeMember: (teamId: number, userId: number) =>
        api.delete<{ message: string }>(`/teams/${teamId}/members/${userId}`),

    updateMySettings: (teamId: number, data: { merge_stats_with_personal: boolean }) =>
        api.patch<{ data: TeamMember }>(`/teams/${teamId}/settings/me`, data),

    // ─── Приглашения ─────────────────────────────────────────────────────────
    invite: (teamId: number, data: { username: string; message?: string }) =>
        api.post<{ data: TeamInvitation }>(`/teams/${teamId}/invite`, data),

    getTeamInvitations: (teamId: number) =>
        api.get<{ data: TeamInvitation[] }>(`/teams/${teamId}/invitations`),

    cancelInvitation: (teamId: number, invId: number) =>
        api.delete<{ message: string }>(`/teams/${teamId}/invitations/${invId}`),

    // ─── Ресурсы ─────────────────────────────────────────────────────────────
    getTeamPrinters: (teamId: number) =>
        api.get<{ data: any[] }>(`/teams/${teamId}/resources/printers`),

    getTeamMaterials: (teamId: number) =>
        api.get<{ data: any[] }>(`/teams/${teamId}/resources/materials`),

    getMyShared: (teamId: number) =>
        api.get<{ data: TeamResource[] }>(`/teams/${teamId}/resources/my`),

    shareResource: (teamId: number, data: { resource_type: 'printer' | 'material'; resource_id: number }) =>
        api.post<{ data: TeamResource }>(`/teams/${teamId}/resources`, data),

    unshareResource: (teamId: number, type: 'printer' | 'material', resourceId: number) =>
        api.delete<{ message: string }>(`/teams/${teamId}/resources/${type}/${resourceId}`),

    // ─── Поиск пользователей ─────────────────────────────────────────────────
    searchUsers: (teamId: number, q: string) =>
        api.get<{ data: { id: number; username: string; avatar: string | null }[] }>(
            `/teams/${teamId}/users/search`, { params: { q } }
        ),

    // ─── Заказы команды ──────────────────────────────────────────────────────
    getTeamOrders: (teamId: number, params?: {
        status?: 'in_progress' | 'completed' | 'cancelled';
        assigned_to?: number;
        limit?: number;
        page?: number;
    }) =>
        api.get<{
            success: boolean;
            data: Order[];
            pagination: { limit: number; offset: number; total: number; page: number };
        }>(`/teams/${teamId}/orders`, { params }),

    // ─── Статистика ──────────────────────────────────────────────────────────
    getTeamStats: (teamId: number) =>
        api.get<{ data: TeamStats }>(`/teams/${teamId}/stats`),

    getMemberStats: (teamId: number) =>
        api.get<{ data: MemberStat[] }>(`/teams/${teamId}/stats/members`),
};

// ─── Приглашения (входящие) ───────────────────────────────────────────────────
export const invitationsAPI = {
    getMy: () =>
        api.get<{ data: TeamInvitation[] }>('/invitations/my'),

    accept: (id: number) =>
        api.post<{ message: string; data: Team }>(`/invitations/${id}/accept`),

    decline: (id: number) =>
        api.post<{ message: string }>(`/invitations/${id}/decline`),
};
