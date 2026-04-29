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

    getCurrentUser: () => api.get("/auth/me"),

    status: () =>
        api.get<{ isAuth: boolean; user: any | null; hasRefreshToken: boolean }>("/auth/status"),

    // Явный вызов рефреша — используется из AuthContext когда hasRefreshToken: true
    refresh: () =>
        api.post<{ message: string; user: any }>("/auth/refresh", {}),
};