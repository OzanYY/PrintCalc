import axios from "axios";
import type {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosError,
} from "axios";

const API_URL = "http://localhost:5000/api";

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Единственное, что нужно для работы с cookies
  headers: {
    "Content-Type": "application/json",
  },
});

// --- Переменные для обработки очереди запросов ---
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(null);
    }
  });
  failedQueue = [];
};

// Обрабатываем ошибки
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
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (
        originalRequest.url?.includes("/auth/login") ||
        originalRequest.url?.includes("/auth/register")
    ) {
      return Promise.reject(error);
    }

    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Проверяем, не является ли это запросом на обновление токена
    if (originalRequest.url?.includes("/auth/refresh")) {
      window.location.href = "/login";
      return Promise.reject(error);
    }

    // Если уже идет обновление токена
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
      // Просто вызываем endpoint обновления
      // Cookies отправятся автоматически благодаря withCredentials: true
      await axios.post(
        `${API_URL}/auth/refresh`,
        {},
        {
          withCredentials: true,
        },
      );

      // Обрабатываем очередь
      processQueue(null);

      // Повторяем оригинальный запрос (токен уже обновлен в cookies)
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError as Error);
      window.location.href = "/login";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
