// ====== ПОЛЬЗОВАТЕЛЬ ======
export interface User {
    id: number | string;
    username: string;
    email: string;
    is_activated: boolean;
    created_at?: string;
}

// ====== АВТОРИЗАЦИЯ ======
export interface AuthResponse {
    message: string;
    user: User;
    accessToken: string;
    refreshToken: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
}

export interface ApiErrorResponse {
    error: string;
    message?: string;
    statusCode?: number;
}