import { create } from "zustand";
import api from "../services/api";
import { jwtDecode } from "jwt-decode";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar?: string;
  bio?: string | null;
  tenantId?: string;
}

/** Empresa oferecida quando o mesmo e-mail tem conta em mais de uma. */
export interface TenantOption {
  id: string;
  name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  /** Empresas para escolher; preenchido quando o e-mail tem mais de uma conta. */
  tenantOptions: TenantOption[];
  clearTenantOptions: () => void;

  login: (email: string, password: string, rememberMe?: boolean, tenantId?: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<boolean>;
  clearError: () => void;
  getToken: () => string | null;
  /** Atualiza campos do usuario em memoria (ex.: avatar recem-enviado). */
  updateUser: (dados: Partial<User>) => void;
}

const AUTH_STORAGE_KEY = "trainify.auth";

function userFromToken(accessToken: string, fallbackEmail: string): User {
  const decoded = jwtDecode<{
    user_id?: string;
    sub?: string;
    role?: string;
    tenant_id?: string;
    name?: string;
    avatar?: string;
  }>(accessToken);

  return {
    id: decoded.user_id || "unknown",
    name: decoded.name || decoded.sub || fallbackEmail,
    email: decoded.sub || fallbackEmail,
    role: decoded.role ? decoded.role.replace("ROLE_", "") : "STUDENT",
    department: "",
    tenantId: decoded.tenant_id,
    avatar: decoded.avatar,
  };
}

function readStoredAuth() {
  if (typeof window === "undefined") return null;

  for (const storage of [window.localStorage, window.sessionStorage]) {
    const stored = storage.getItem(AUTH_STORAGE_KEY);
    if (!stored) continue;

    try {
      const { accessToken, refreshToken } = JSON.parse(stored);
      const decodedToken = jwtDecode<{ exp?: number }>(accessToken);
      if (decodedToken.exp && decodedToken.exp * 1000 <= Date.now() && !refreshToken) {
        storage.removeItem(AUTH_STORAGE_KEY);
        continue;
      }
      const user = userFromToken(accessToken, "");
      return { user, token: accessToken, refreshToken };
    } catch {
      storage.removeItem(AUTH_STORAGE_KEY);
    }
  }

  return null;
}

function persistAuth(accessToken: string, refreshToken: string | null, rememberMe: boolean) {
  const target = rememberMe ? window.localStorage : window.sessionStorage;
  const other = rememberMe ? window.sessionStorage : window.localStorage;
  other.removeItem(AUTH_STORAGE_KEY);
  target.setItem(AUTH_STORAGE_KEY, JSON.stringify({ accessToken, refreshToken }));
}

function getErrorMessage(error: any) {
  const status = error.response?.status;
  const responseData = error.response?.data;
  const detail = responseData?.detail || responseData?.message;

  if (status === 401) return "E-mail ou senha incorretos.";
  if (status === 403) return "Usuário sem permissão para acessar a plataforma.";
  if (status === 404) return "Serviço de autenticação não encontrado.";
  if (status === 409) return "Não foi possível concluir o login com esta conta.";
  if (status === 422) return "Confira os dados informados.";
  if (typeof detail === "string") return detail;
  if (status >= 500) return "Não foi possível concluir o login. Tente novamente mais tarde.";
  if (!error.response) return "Não foi possível conectar ao servidor. Verifique a API e tente novamente.";
  return "Não foi possível conectar ao servidor. Tente novamente.";
}

const storedAuth = readStoredAuth();

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: storedAuth?.user || null,
  token: storedAuth?.token || null,
  refreshToken: storedAuth?.refreshToken || null,
  isAuthenticated: Boolean(storedAuth),
  isLoading: false,
  error: null,
  tenantOptions: [],

  clearTenantOptions: () => set({ tenantOptions: [] }),

  login: async (email: string, password: string, rememberMe = false, tenantId?: string) => {
    set({ isLoading: true, error: null, tenantOptions: [] });



    try {
      const normalizedEmail = email.trim();
      const response = await api.post("/auth/login", {
        email: normalizedEmail,
        password,
        ...(tenantId ? { tenantId } : {}),
      });
      const { accessToken, refreshToken: rToken } = response.data;
      const user = userFromToken(accessToken, normalizedEmail);

      persistAuth(accessToken, rToken || null, rememberMe);

      set({
        user,
        token: accessToken,
        refreshToken: rToken || null,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      // O e-mail tem conta em mais de uma empresa: a tela precisa perguntar qual
      if (err.response?.data?.type === "urn:problem-type:tenant-selection-required") {
        set({
          isLoading: false,
          isAuthenticated: false,
          error: null,
          tenantOptions: err.response.data.tenants || [],
        });
        return;
      }

      const message = getErrorMessage(err);
      set({ isLoading: false, error: message, isAuthenticated: false, tenantOptions: [] });
    }
  },

  register: async (dataToSubmit: any) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post("/auth/register", dataToSubmit);
      
      const userStr = atob(data.accessToken.split(".")[1]);
      const userPayload = JSON.parse(userStr);
      
      const user = {
        id: userPayload.user_id,
        name: userPayload.name,
        email: userPayload.sub,
        role: userPayload.role ? userPayload.role.replace("ROLE_", "") : "STUDENT",
        department: "",
        tenantId: userPayload.tenant_id,
      };

      set({
        user,
        token: data.accessToken,
        refreshToken: data.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
      persistAuth(data.accessToken, data.refreshToken || null, false);
    } catch (err: any) {
      set({ isLoading: false, error: err.response?.data?.detail || "Erro ao registrar." });
      throw err;
    }
  },

  forgotPassword: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      set({ isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: getErrorMessage(err) });
      throw err;
    }
  },

  resetPassword: async (token: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.post("/auth/reset-password", { token, password });
      set({ isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: getErrorMessage(err) });
      throw err;
    }
  },

  logout: () => {
    const currentToken = get().token;
    if (currentToken) {
      void api.post("/auth/logout").catch(() => undefined);
    }
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    }
    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      error: null,
    });
  },

  refreshSession: async () => {
    const { refreshToken } = get();
    if (!refreshToken) {
      get().logout();
      return false;
    }

    try {
      const response = await api.post("/auth/refresh", { refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = response.data;
      const currentUser = get().user;
      const user = userFromToken(accessToken, currentUser?.email || "");

      persistAuth(accessToken, newRefreshToken || refreshToken, Boolean(window.localStorage.getItem(AUTH_STORAGE_KEY)));

      set({
        token: accessToken,
        refreshToken: newRefreshToken || refreshToken,
        user,
      });
      return true;
    } catch {
      get().logout();
      return false;
    }
  },

  clearError: () => set({ error: null }),

  // O usuario e derivado do JWT, que so muda no login ou no refresh. Sem isso,
  // uma foto recem-enviada so apareceria no proximo acesso.
  updateUser: (dados) => {
    const atual = get().user;
    if (atual) set({ user: { ...atual, ...dados } });
  },

  getToken: () => get().token,
}));
