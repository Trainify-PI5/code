import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

const BASE_URL = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL || 'http://localhost:8080/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor: Injeta Bearer token da store em memória ──
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: Refresh transparente com fila de requests (T015) ──

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: InternalAxiosRequestConfig) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: AxiosError | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      // Re-injetar o novo token na configuração da requisição que falhou
      const token = useAuthStore.getState().token;
      const config = {} as InternalAxiosRequestConfig;
      // O token será re-injetado pelo interceptor de requisição ao tentar novamente
      prom.resolve(config);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Se não é 401 ou já tentou retry, propaga o erro
    if (error.response?.status !== 401 || originalRequest._retry) {
      // Tratar 409 (Conflito / Optimistic Lock) — toast seria disparado por quem consume
      return Promise.reject(error);
    }

    // Se já está fazendo refresh, enfilera o request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => {
        // Token já foi atualizado na store; retry com novo token
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const success = await useAuthStore.getState().refreshSession();

      if (success) {
        processQueue(null);
        // Tentar novamente a requisição original com o novo token (será injetado pelo interceptor de requisição)
        return api(originalRequest);
      } else {
        processQueue(error);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    } catch (refreshError) {
      processQueue(error);
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
