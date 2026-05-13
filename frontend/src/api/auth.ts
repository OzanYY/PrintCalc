// api/auth.ts
import api from "./axios";

export const authAPI = {
    login: (email: string, password: string) =>
        api.post<{ success: boolean; user: any }>("/auth/login", { email, password }),

    register: (userData: { name: string; email: string; password: string }) =>
        api.post("/auth/register", {
            username: userData.name,
            email:    userData.email,
            password: userData.password,
        }),

    logout: () => api.post("/auth/logout"),

    logoutAll: () => api.post("/auth/logout-all"),

    getCurrentUser: () =>
        api.get<{ user: any }>("/auth/me"),

    status: () =>
        api.get<{ isAuth: boolean; user: any | null; hasRefreshToken: boolean }>("/auth/status"),

    refresh: () =>
        api.post<{ message: string; user: any }>("/auth/refresh", {}),

    changePassword: (data: { oldPassword: string; newPassword: string }) =>
        api.post<{ message: string }>("/auth/change-password", data),

    updateProfile: (data: { username?: string; email?: string }) =>
        api.put<{ user: any }>("/auth/me", data),

    // GET /auth/sessions — список активных сессий
    getSessions: () =>
        api.get<{ sessions: any[]; total: number }>("/auth/sessions"),

    // DELETE /auth/sessions/:id — завершить конкретную сессию
    terminateSession: (sessionId: string) =>
        api.delete<{ message: string }>(`/auth/sessions/${sessionId}`),

    // POST /auth/terminate-other-sessions — завершить все сессии кроме текущей
    // Бэкенд определяет текущую по refreshToken в httpOnly-куке,
    // поэтому тело передавать не нужно (если бэкенд поддерживает это).
    // Если бэкенд требует передать токен — замените на:
    //   api.post("/auth/terminate-other-sessions", { refreshToken })
    terminateOtherSessions: () =>
        api.post<{ message: string }>("/auth/terminate-other-sessions", {}),

    // DELETE /auth/delete-account — удалить аккаунт
    deleteAccount: (password: string) =>
        api.delete<{ message: string }>("/auth/delete-account", { data: { password } }),
};