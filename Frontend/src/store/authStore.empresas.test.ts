import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import MockAdapter from "axios-mock-adapter";
import { api } from "../services/api";
import { useAuthStore } from "./authStore";

/**
 * O mesmo e-mail pode ter conta em empresas diferentes. Quando isso acontece, o
 * backend devolve 409 com a lista e a tela pergunta em qual entrar.
 */
describe("login com conta em mais de uma empresa", () => {
  let mock: MockAdapter;

  // Token de teste com as informações que a store lê (não é credencial de nada)
  const tokenFalso = [
    btoa(JSON.stringify({ alg: "HS256" })),
    btoa(JSON.stringify({ sub: "consultor@parceiro.com", role: "ROLE_INSTRUCTOR", tenant_id: "empresa-b", name: "Consultor" })),
    "assinatura",
  ].join(".");

  beforeEach(() => {
    mock = new MockAdapter(api);
    useAuthStore.setState({
      user: null, token: null, refreshToken: null, isAuthenticated: false,
      isLoading: false, error: null, tenantOptions: [],
    });
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
  });

  it("oferece as empresas em vez de mostrar erro", async () => {
    mock.onPost("/auth/login").reply(409, {
      type: "urn:problem-type:tenant-selection-required",
      detail: "Este e-mail tem acesso a mais de uma empresa.",
      tenants: [
        { id: "empresa-a", name: "Alfa Transportes" },
        { id: "empresa-b", name: "Beta Log" },
      ],
    });

    await useAuthStore.getState().login("consultor@parceiro.com", "senha");

    const estado = useAuthStore.getState();
    expect(estado.error).toBeNull();
    expect(estado.isAuthenticated).toBe(false);
    expect(estado.tenantOptions.map((e) => e.name)).toEqual(["Alfa Transportes", "Beta Log"]);
  });

  it("entra na empresa escolhida", async () => {
    mock.onPost("/auth/login").reply((config) => {
      const corpo = JSON.parse(config.data);
      if (!corpo.tenantId) {
        return [409, { type: "urn:problem-type:tenant-selection-required", tenants: [{ id: "empresa-b", name: "Beta Log" }] }];
      }
      return [200, { accessToken: tokenFalso, refreshToken: "refresh" }];
    });

    await useAuthStore.getState().login("consultor@parceiro.com", "senha");
    await useAuthStore.getState().login("consultor@parceiro.com", "senha", false, "empresa-b");

    const estado = useAuthStore.getState();
    expect(estado.isAuthenticated).toBe(true);
    expect(estado.user?.tenantId).toBe("empresa-b");
    expect(estado.tenantOptions).toEqual([]);
  });

  it("senha errada continua virando mensagem de erro, sem escolha de empresa", async () => {
    mock.onPost("/auth/login").reply(401, { detail: "E-mail ou senha incorretos." });

    await useAuthStore.getState().login("consultor@parceiro.com", "errada");

    const estado = useAuthStore.getState();
    expect(estado.error).toBe("E-mail ou senha incorretos.");
    expect(estado.tenantOptions).toEqual([]);
  });
});
