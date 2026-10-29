import { forwardRef, useImperativeHandle } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

// Há site key: a tela passa a exigir o reCAPTCHA.
vi.mock("../../config", () => ({ RECAPTCHA_SITE_KEY: "chave-de-teste" }));

const { store } = vi.hoisted(() => ({
  store: {
    login: vi.fn(),
    isLoading: false,
    error: null as string | null,
    clearError: vi.fn(),
    tenantOptions: [] as unknown[],
    clearTenantOptions: vi.fn(),
  },
}));

// useAuthStore é usado como hook e como useAuthStore.getState() dentro do submit.
vi.mock("../../store/authStore", () => ({
  useAuthStore: Object.assign(() => store, { getState: () => store }),
}));
vi.mock("../../store/themeStore", () => ({
  useThemeStore: () => ({ isDarkMode: false, toggleDarkMode: vi.fn() }),
}));
vi.mock("../../services/api", () => ({ aoAcordarServidor: () => () => {} }));

// Stub do widget: um botão resolve o desafio; o reset (via ref) zera o token.
vi.mock("../../components/Recaptcha", () => ({
  default: forwardRef<{ reset: () => void }, { onChange: (t: string | null) => void }>(
    ({ onChange }, ref) => {
      useImperativeHandle(ref, () => ({ reset: () => onChange(null) }));
      return (
        <button type="button" onClick={() => onChange("token-captcha")}>
          resolver-captcha
        </button>
      );
    },
  ),
}));

import Login from "./Login";

const botaoEntrar = () => screen.getByRole("button", { name: /Entrar na plataforma/i });
const show = () => render(<Login onNavigate={() => {}} />);

beforeEach(() => {
  vi.clearAllMocks();
  store.isLoading = false;
  store.error = null;
  store.tenantOptions = [];
});

it("mantém o login bloqueado enquanto o reCAPTCHA não é resolvido", async () => {
  show();
  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText("seu@email.com"), "ana@trainify.com");
  await user.type(screen.getByPlaceholderText("••••••••"), "senha123");

  // E-mail e senha válidos, mas sem o desafio o botão continua desabilitado.
  expect(botaoEntrar()).toBeDisabled();
  expect(store.login).not.toHaveBeenCalled();
});

it("libera e envia o token quando o reCAPTCHA é resolvido", async () => {
  show();
  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText("seu@email.com"), "ana@trainify.com");
  await user.type(screen.getByPlaceholderText("••••••••"), "senha123");
  await user.click(screen.getByRole("button", { name: "resolver-captcha" }));

  expect(botaoEntrar()).toBeEnabled();

  await user.click(botaoEntrar());
  expect(store.login).toHaveBeenCalledWith(
    "ana@trainify.com",
    "senha123",
    false,
    undefined,
    "token-captcha",
  );
});

it("limpa o desafio e volta a bloquear quando o login falha", async () => {
  store.login.mockImplementation(async () => {
    // O store passa a expor erro, como no fluxo real de credencial inválida.
    store.error = "E-mail ou senha incorretos.";
  });
  show();
  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText("seu@email.com"), "ana@trainify.com");
  await user.type(screen.getByPlaceholderText("••••••••"), "senha123");
  await user.click(screen.getByRole("button", { name: "resolver-captcha" }));
  await user.click(botaoEntrar());

  // Token de uso único: após falhar, o desafio é resetado e o botão trava de novo.
  expect(botaoEntrar()).toBeDisabled();
});
