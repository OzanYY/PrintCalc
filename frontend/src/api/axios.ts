import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';

const API_URL = 'http://localhost:5000/api';

const api: AxiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Добавляем токен к каждому запросу
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Обрабатываем ошибки
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
        
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) throw new Error('No refresh token');

                const response = await axios.post(`${API_URL}/auth/refresh`, {
                    refreshToken
                });

                const { accessToken, refreshToken: newRefreshToken } = response.data;
                
                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', newRefreshToken);

                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                }
                
                return api(originalRequest);
            } catch (refreshError) {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }
        
        return Promise.reject(error);
    }
);

export default api;