import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiMock } = vi.hoisted(() => ({
  apiMock: { post: vi.fn(), get: vi.fn() },
}));

vi.mock('../services/api', () => ({
  default: apiMock,
  api: apiMock,
}));

import { useAuthStore } from './authStore';

const AUTH_STORAGE_KEY = 'trainify.auth';

/** Monta um JWT nao assinado - jwt-decode so le o payload em base64. */
function makeToken(payload: Record<string, unknown>) {
  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

const inOneHour = Math.floor(Date.now() / 1000) + 3600;

const validToken = makeToken({
  user_id: 'u-1',
  sub: 'ana@trainify.com',
  name: 'Ana Souza',
  role: 'ROLE_ADMIN',
  tenant_id: 't-1',
  exp: inOneHour,
});

function axiosError(status?: number, data?: unknown) {
  return { response: status ? { status, data } : undefined };
}

function resetStore() {
  useAuthStore.setState({
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });
}

describe('authStore', () => {
  beforeEach(() => {
    apiMock.post.mockReset();
    apiMock.post.mockResolvedValue({ data: {} });
    resetStore();
  });

  describe('login', () => {
    it('autentica e deriva o usuario a partir do JWT', async () => {
      apiMock.post.mockResolvedValueOnce({
        data: { accessToken: validToken, refreshToken: 'refresh-1' },
      });

      await act(() => useAuthStore.getState().login(' ana@trainify.com ', 'senha123'));

      const state = useAuthStore.getState();
      expect(apiMock.post).toHaveBeenCalledWith('/auth/login', {
        email: 'ana@trainify.com',
        password: 'senha123',
      });
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.token).toBe(validToken);
      expect(state.refreshToken).toBe('refresh-1');
      expect(state.user).toEqual({
        id: 'u-1',
        name: 'Ana Souza',
        email: 'ana@trainify.com',
        role: 'ADMIN',
        department: 'LMS',
        tenantId: 't-1',
        avatar: undefined,
      });
    });

    it('usa sessionStorage quando rememberMe e falso', async () => {
      apiMock.post.mockResolvedValueOnce({ data: { accessToken: validToken, refreshToken: 'r' } });

      await act(() => useAuthStore.getState().login('ana@trainify.com', 'senha123', false));

      expect(window.sessionStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();
      expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    });

    it('usa localStorage quando rememberMe e verdadeiro', async () => {
      apiMock.post.mockResolvedValueOnce({ data: { accessToken: validToken, refreshToken: 'r' } });

      await act(() => useAuthStore.getState().login('ana@trainify.com', 'senha123', true));

      const stored = JSON.parse(window.localStorage.getItem(AUTH_STORAGE_KEY) as string);
      expect(stored).toEqual({ accessToken: validToken, refreshToken: 'r' });
      expect(window.sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    });

    it('cai para o papel STUDENT quando o token nao traz role', async () => {
      const token = makeToken({ user_id: 'u-2', sub: 'joao@trainify.com', exp: inOneHour });
      apiMock.post.mockResolvedValueOnce({ data: { accessToken: token } });

      await act(() => useAuthStore.getState().login('joao@trainify.com', 'x'));

      expect(useAuthStore.getState().user?.role).toBe('STUDENT');
      expect(useAuthStore.getState().refreshToken).toBeNull();
    });

    it.each([
      [401, 'E-mail ou senha incorretos.'],
      [403, 'Usuário sem permissão para acessar a plataforma.'],
      [404, 'Serviço de autenticação não encontrado.'],
      [409, 'Não foi possível concluir o login com esta conta.'],
      [422, 'Confira os dados informados.'],
      [500, 'Não foi possível concluir o login. Tente novamente mais tarde.'],
    ])('traduz o status %i em mensagem amigavel', async (status, message) => {
      apiMock.post.mockRejectedValueOnce(axiosError(status as number));

      await act(() => useAuthStore.getState().login('ana@trainify.com', 'errada'));

      const state = useAuthStore.getState();
      expect(state.error).toBe(message);
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('prefere o detail enviado pela API quando o status nao e mapeado', async () => {
      apiMock.post.mockRejectedValueOnce(axiosError(418, { detail: 'Conta bloqueada.' }));

      await act(() => useAuthStore.getState().login('ana@trainify.com', 'x'));

      expect(useAuthStore.getState().error).toBe('Conta bloqueada.');
    });

    it('avisa sobre falha de conexao quando nao ha resposta', async () => {
      apiMock.post.mockRejectedValueOnce(axiosError());

      await act(() => useAuthStore.getState().login('ana@trainify.com', 'x'));

      expect(useAuthStore.getState().error).toBe(
        'Não foi possível conectar ao servidor. Verifique a API e tente novamente.',
      );
    });

    it('nao persiste credenciais quando o login falha', async () => {
      apiMock.post.mockRejectedValueOnce(axiosError(401));

      await act(() => useAuthStore.getState().login('ana@trainify.com', 'x'));

      expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
      expect(window.sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    });
  });

  describe('register', () => {
    it('autentica o usuario recem-criado', async () => {
      apiMock.post.mockResolvedValueOnce({
        data: { accessToken: validToken, refreshToken: 'refresh-2' },
      });

      await act(() => useAuthStore.getState().register({ name: 'Ana', email: 'ana@trainify.com' }));

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.id).toBe('u-1');
      expect(state.user?.role).toBe('ADMIN');
      expect(window.sessionStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();
    });

    it('propaga o erro e guarda a mensagem', async () => {
      apiMock.post.mockRejectedValueOnce(axiosError(409, { detail: 'E-mail ja cadastrado.' }));

      await expect(
        act(() => useAuthStore.getState().register({ email: 'ana@trainify.com' })),
      ).rejects.toBeDefined();

      expect(useAuthStore.getState().error).toBe('E-mail ja cadastrado.');
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('forgotPassword / resetPassword', () => {
    it('envia o e-mail normalizado e encerra o loading', async () => {
      await act(() => useAuthStore.getState().forgotPassword('  ana@trainify.com '));

      expect(apiMock.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'ana@trainify.com',
      });
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('registra erro e relanca quando o envio falha', async () => {
      apiMock.post.mockRejectedValueOnce(axiosError(404));

      await expect(
        act(() => useAuthStore.getState().forgotPassword('ana@trainify.com')),
      ).rejects.toBeDefined();

      expect(useAuthStore.getState().error).toBe('Serviço de autenticação não encontrado.');
    });

    it('envia token e nova senha no reset', async () => {
      await act(() => useAuthStore.getState().resetPassword('tok-1', 'novaSenha'));

      expect(apiMock.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'tok-1',
        password: 'novaSenha',
      });
      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('logout', () => {
    beforeEach(async () => {
      apiMock.post.mockResolvedValueOnce({ data: { accessToken: validToken, refreshToken: 'r' } });
      await act(() => useAuthStore.getState().login('ana@trainify.com', 'senha123', true));
      apiMock.post.mockClear();
    });

    it('limpa o estado e os storages', () => {
      act(() => useAuthStore.getState().logout());

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeNull();
      expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
      expect(window.sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    });

    it('avisa o backend quando havia sessao ativa', () => {
      act(() => useAuthStore.getState().logout());
      expect(apiMock.post).toHaveBeenCalledWith('/auth/logout');
    });

    it('nao chama o backend quando nao havia token', () => {
      resetStore();
      act(() => useAuthStore.getState().logout());
      expect(apiMock.post).not.toHaveBeenCalled();
    });
  });

  describe('refreshSession', () => {
    it('renova o token e mantem o usuario', async () => {
      const newToken = makeToken({
        user_id: 'u-1',
        sub: 'ana@trainify.com',
        name: 'Ana Souza',
        role: 'ROLE_ADMIN',
        exp: inOneHour,
      });
      useAuthStore.setState({ refreshToken: 'refresh-1', isAuthenticated: true });
      apiMock.post.mockResolvedValueOnce({
        data: { accessToken: newToken, refreshToken: 'refresh-2' },
      });

      let result: boolean | undefined;
      await act(async () => {
        result = await useAuthStore.getState().refreshSession();
      });

      expect(result).toBe(true);
      expect(apiMock.post).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'refresh-1' });
      expect(useAuthStore.getState().token).toBe(newToken);
      expect(useAuthStore.getState().refreshToken).toBe('refresh-2');
    });

    it('mantem o refreshToken atual quando a API nao devolve um novo', async () => {
      useAuthStore.setState({ refreshToken: 'refresh-1' });
      apiMock.post.mockResolvedValueOnce({ data: { accessToken: validToken } });

      await act(() => useAuthStore.getState().refreshSession());

      expect(useAuthStore.getState().refreshToken).toBe('refresh-1');
    });

    it('desloga quando nao existe refreshToken', async () => {
      useAuthStore.setState({ token: 'antigo', isAuthenticated: true, refreshToken: null });

      let result: boolean | undefined;
      await act(async () => {
        result = await useAuthStore.getState().refreshSession();
      });

      expect(result).toBe(false);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(apiMock.post).not.toHaveBeenCalledWith('/auth/refresh', expect.anything());
    });

    it('desloga quando a renovacao falha', async () => {
      useAuthStore.setState({ token: validToken, refreshToken: 'refresh-1', isAuthenticated: true });
      apiMock.post.mockRejectedValueOnce(axiosError(401));

      let result: boolean | undefined;
      await act(async () => {
        result = await useAuthStore.getState().refreshSession();
      });

      expect(result).toBe(false);
      expect(useAuthStore.getState().token).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('helpers', () => {
    it('clearError limpa a mensagem de erro', () => {
      useAuthStore.setState({ error: 'algo deu errado' });
      act(() => useAuthStore.getState().clearError());
      expect(useAuthStore.getState().error).toBeNull();
    });

    it('getToken devolve o token em memoria', () => {
      expect(useAuthStore.getState().getToken()).toBeNull();
      useAuthStore.setState({ token: validToken });
      expect(useAuthStore.getState().getToken()).toBe(validToken);
    });
  });
});

describe('authStore - hidratacao inicial', () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('restaura a sessao salva em localStorage', async () => {
    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ accessToken: validToken, refreshToken: 'refresh-1' }),
    );

    const { useAuthStore: store } = await import('./authStore');

    expect(store.getState().isAuthenticated).toBe(true);
    expect(store.getState().user?.email).toBe('ana@trainify.com');
    expect(store.getState().refreshToken).toBe('refresh-1');
  });

  it('restaura a sessao salva em sessionStorage', async () => {
    window.sessionStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ accessToken: validToken, refreshToken: null }),
    );

    const { useAuthStore: store } = await import('./authStore');

    expect(store.getState().isAuthenticated).toBe(true);
    expect(store.getState().token).toBe(validToken);
  });

  it('descarta token expirado sem refreshToken', async () => {
    const expired = makeToken({
      user_id: 'u-1',
      sub: 'ana@trainify.com',
      exp: Math.floor(Date.now() / 1000) - 60,
    });
    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ accessToken: expired, refreshToken: null }),
    );

    const { useAuthStore: store } = await import('./authStore');

    expect(store.getState().isAuthenticated).toBe(false);
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('mantem token expirado quando ha refreshToken para renovar', async () => {
    const expired = makeToken({
      user_id: 'u-1',
      sub: 'ana@trainify.com',
      exp: Math.floor(Date.now() / 1000) - 60,
    });
    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ accessToken: expired, refreshToken: 'refresh-1' }),
    );

    const { useAuthStore: store } = await import('./authStore');

    expect(store.getState().isAuthenticated).toBe(true);
  });

  it('limpa entradas corrompidas sem quebrar o boot', async () => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, 'nao-e-json');

    const { useAuthStore: store } = await import('./authStore');

    expect(store.getState().isAuthenticated).toBe(false);
    expect(store.getState().user).toBeNull();
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });
});
