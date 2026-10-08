import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import MockAdapter from "axios-mock-adapter";
import { api, aoAcordarServidor } from "./api";
import { useAuthStore } from "../store/authStore";

/**
 * O Render hiberna o backend no plano gratuito. Enquanto ele sobe, o proxy
 * responde 502/503 ou derruba a conexão, e antes disso a pessoa via "erro de
 * API" e tentava de novo três ou quatro vezes até entrar.
 */
describe("espera o servidor acordar", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(api);
    vi.useFakeTimers();
    useAuthStore.setState({ token: null, refreshToken: null, user: null, isAuthenticated: false });
  });

  afterEach(() => {
    mock.restore();
    vi.useRealTimers();
  });

  /** Deixa as esperas do retry passarem enquanto a promessa não resolve. */
  async function correrRelogio(promessa: Promise<unknown>) {
    const resultado = promessa.catch((e) => e);
    for (let i = 0; i < 10; i++) {
      await vi.advanceTimersByTimeAsync(15000);
    }
    return resultado;
  }

  it("repete o login quando o servidor ainda está subindo", async () => {
    mock.onPost("/auth/login").replyOnce(503).onPost("/auth/login").reply(200, { accessToken: "abc" });

    const resposta: any = await correrRelogio(api.post("/auth/login", { email: "a@b.com", password: "x" }));

    expect(resposta.status).toBe(200);
    expect(resposta.data.accessToken).toBe("abc");
    expect(mock.history.post.length).toBe(2);
  });

  it("repete também quando a conexão nem chega ao servidor", async () => {
    mock.onGet("/courses").networkErrorOnce().onGet("/courses").reply(200, []);

    const resposta: any = await correrRelogio(api.get("/courses"));

    expect(resposta.status).toBe(200);
    expect(mock.history.get.length).toBe(2);
  });

  it("avisa a tela enquanto espera e depois encerra o aviso", async () => {
    const avisos: boolean[] = [];
    const parar = aoAcordarServidor((acordando) => avisos.push(acordando));

    mock.onPost("/auth/login").replyOnce(502).onPost("/auth/login").reply(200, {});
    await correrRelogio(api.post("/auth/login", {}));
    parar();

    expect(avisos[0]).toBe(true);
    expect(avisos[avisos.length - 1]).toBe(false);
  });

  it("desiste depois de algumas tentativas, em vez de insistir para sempre", async () => {
    mock.onGet("/courses").reply(503);

    const erro: any = await correrRelogio(api.get("/courses"));

    expect(erro.response.status).toBe(503);
    // a chamada original mais as tentativas
    expect(mock.history.get.length).toBe(5);
  });

  it("não repete erro de verdade, como senha errada", async () => {
    mock.onPost("/auth/login").reply(401, { detail: "E-mail ou senha incorretos." });

    const erro: any = await correrRelogio(api.post("/auth/login", {}));

    expect(erro.response.status).toBe(401);
    expect(mock.history.post.length).toBe(1);
  });

  it("não repete escrita que pode duplicar dados", async () => {
    mock.onPost("/courses").reply(503);

    const erro: any = await correrRelogio(api.post("/courses", { title: "Novo" }));

    expect(erro.response.status).toBe(503);
    expect(mock.history.post.length).toBe(1);
  });
});
