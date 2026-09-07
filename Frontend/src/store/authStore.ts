import { create } from "zustand";
import api from "../services/api";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar?: string;
  tenantId?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<boolean>;
  clearError: () => void;
  getToken: () => string | null;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });



    try {
      const response = await api.post("/auth/login", { email, password });
      const { accessToken, refreshToken: rToken } = response.data;

      const { jwtDecode } = await import("jwt-decode");
      const decoded: any = jwtDecode(accessToken);

      const user: User = {
        id: decoded.user_id || "unknown",
        name: decoded.sub || email,
        email: email,
        role: decoded.role ? decoded.role.replace("ROLE_", "") : "STUDENT",
        department: "LMS",
        tenantId: decoded.tenant_id,
      };

      set({
        user,
        token: accessToken,
        refreshToken: rToken || null,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      const message =
        err.response?.data?.detail || "Erro ao fazer login. Tente novamente.";
      set({ isLoading: false, error: message, isAuthenticated: false });
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
        tenantId: userPayload.tenant_id,
      };

      set({
        user,
        token: data.accessToken,
        refreshToken: data.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      set({ isLoading: false, error: err.response?.data?.detail || "Erro ao registrar." });
      throw err;
    }
  },

  forgotPassword: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      // Mock since Backend.md doesn't list a forgot-password endpoint yet, or we assume it exists
      await new Promise((r) => setTimeout(r, 600));
      set({ isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: "Erro ao recuperar senha." });
      throw err;
    }
  },

  logout: () => {
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

      const { jwtDecode } = await import("jwt-decode");
      const decoded: any = jwtDecode(accessToken);

      set({
        token: accessToken,
        refreshToken: newRefreshToken || refreshToken,
        user: {
          ...get().user!,
          id: decoded.user_id || get().user!.id,
          role: decoded.role ? decoded.role.replace("ROLE_", "") : get().user!.role,
          tenantId: decoded.tenant_id || get().user!.tenantId,
        },
      });
      return true;
    } catch {
      get().logout();
      return false;
    }
  },

  clearError: () => set({ error: null }),

  getToken: () => get().token,
}));
