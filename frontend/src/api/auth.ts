import api from './axios';
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '../types';

export const authAPI = {
    register: (data: RegisterRequest) => 
        api.post<AuthResponse>('/auth/register', data),
    
    login: (data: LoginRequest) => 
        api.post<AuthResponse>('/auth/login', data),
    
    logout: (refreshToken: string) => 
        api.post<{ message: string }>('/auth/logout', { refreshToken }),
    
    getMe: () => 
        api.get<{ user: User }>('/auth/me'),
    
    refresh: (refreshToken: string) => 
        api.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken }),
};