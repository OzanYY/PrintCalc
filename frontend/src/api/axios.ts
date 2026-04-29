import axios from "axios";
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from "axios";
import { authRefreshBridge } from "@/utils/authRefreshBridge";

const API_URL = "http://localhost:5000/api";

const api: AxiosInstance = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
});

let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null) => {
    failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve(null)));
    failedQueue = [];
};

// ─── Единственная функция рефреша — используется и интерцептором и AuthContext ──
// Гарантирует что одновременно идёт максимум один запрос на рефреш.
let refreshPromise: Promise<void> | null = null;

export async function performRefresh(): Promise<void> {
    if (refreshPromise) {
        // Рефреш уже идёт — ждём его завершения
        return refreshPromise;
    }

    refreshPromise = axios
        .post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
        .then(async (res) => {
            await authRefreshBridge.notify();
            processQueue(null);
        })
        .catch((err) => {
            processQueue(err);
            throw err;
        })
        .finally(() => {
            refreshPromise = null;
            isRefreshing = false;
        });

    return refreshPromise;
}

api.interceptors.response.use(
    (response) => {
    // Логирование успешных ответов
    console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      status: response.status,
      data: response.data,
      headers: response.headers,
    });
    return response;
  },
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (
            originalRequest.url?.includes("/auth/login") ||
            originalRequest.url?.includes("/auth/register") ||
            originalRequest.url?.includes("/auth/refresh")
        ) {
            return Promise.reject(error);
        }

        if (!originalRequest || error.response?.status !== 401) {
            return Promise.reject(error);
        }

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            })
                .then(() => api(originalRequest))
                .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            await performRefresh();
            return api(originalRequest);
        } catch {
            return Promise.reject(error);
        }
    }
);

export default api;