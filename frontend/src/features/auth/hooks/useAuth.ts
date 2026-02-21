// src/features/auth/hooks/useAuth.ts
import { useState } from 'react';
import { authAPI } from '@/api/auth';
import type { LoginRequest, RegisterRequest, User } from '@/types';

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const register = async (data: RegisterRequest) => {
        setLoading(true);
        setError(null);
        try {
            console.log('📤 Register request:', data);
            
            const response = await authAPI.register(data);
            console.log('📥 Register response:', response.data);
            
            const { user, accessToken, refreshToken } = response.data;
            
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
            setUser(user);
            
            return response.data;
            
        } catch (err: any) {
            console.error('❌ Register error:', err);
            console.error('❌ Error response:', err.response?.data);
            
            const errorMessage = err.response?.data?.error || 
                                 err.response?.data?.message || 
                                 err.message || 
                                 'Ошибка регистрации';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const login = async (data: LoginRequest) => {
        setLoading(true);
        setError(null);
        try {
            const response = await authAPI.login(data);
            
            const { user, accessToken, refreshToken } = response.data;
            
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
            setUser(user);
            
            return response.data;
            
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || 
                                 err.response?.data?.message || 
                                 err.message || 
                                 'Ошибка входа';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
            try {
                await authAPI.logout(refreshToken);
            } catch (err) {
                console.error('Logout error:', err);
            }
        }
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
    };

    return {
        user,
        loading,
        error,
        register,
        login,
        logout,
        isAuthenticated: !!user
    };
};