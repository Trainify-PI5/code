import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import { API_BASE_URL } from '../config';

const BASE_URL = API_BASE_URL;

export const api = axios.create({
  baseURL: BASE_URL,
  // O backend no plano gratuito do Render hiberna e leva ate ~4 minutos para
  // acordar. Com um tempo curto o site mostrava "nao foi possivel conectar".
  timeout: 240000,
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

// ── Servidor acordando: o Render hiberna e as primeiras chamadas falham ──
//
// Enquanto o serviço sobe, o proxy responde 502/503/504 ou derruba a conexão.
// Sem isto, a pessoa via "erro de API" e tentava de novo três ou quatro vezes
// até entrar. Aqui a própria chamada espera e tenta sozinha.

const MAX_TENTATIVAS = 4;
const ESPERA_INICIAL_MS = 3000;

/** Falhas que indicam servidor subindo, e não erro de verdade. */
function servidorAcordando(error: AxiosError) {
  if (error.code === 'ECONNABORTED') return false; // tempo esgotado: não insiste
  if (!error.response) return true; // sem resposta: rede ou serviço fora do ar
  return [502, 503, 504].includes(error.response.status);
}

function metodoSeguroParaRepetir(config?: InternalAxiosRequestConfig) {
  const metodo = (config?.method || 'get').toLowerCase();
  // Repetir GET é sempre seguro. POST de login também: ou autentica, ou não.
  return metodo === 'get' || Boolean(config?.url?.includes('/auth/login'));
}

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Avisa a interface que o servidor está acordando, para mostrar o aviso certo. */
type OuvinteDeEspera = (acordando: boolean) => void;
const ouvintes = new Set<OuvinteDeEspera>();

export function aoAcordarServidor(ouvinte: OuvinteDeEspera) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

function avisar(acordando: boolean) {
  ouvintes.forEach((ouvinte) => ouvinte(acordando));
}

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
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _tentativas?: number;
    };

    // Servidor subindo: espera e tenta de novo, em vez de mostrar erro
    if (servidorAcordando(error) && metodoSeguroParaRepetir(originalRequest)) {
      const tentativas = (originalRequest._tentativas || 0) + 1;

      if (tentativas <= MAX_TENTATIVAS) {
        originalRequest._tentativas = tentativas;
        avisar(true);
        await esperar(ESPERA_INICIAL_MS * tentativas);
        try {
          return await api(originalRequest);
        } finally {
          if (tentativas === 1) avisar(false);
        }
      }
      avisar(false);
    }

    // Login and refresh errors must reach the caller instead of triggering another refresh.
    const isAuthRequest = originalRequest?.url?.includes('/auth/');
    if (isAuthRequest) return Promise.reject(error);

    // Se não é 401 ou já tentou retry, propaga o erro
    if (error.response?.status !== 401 || originalRequest?._retry) {
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
