import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Settings from "./Settings";
import api from "../services/api";

vi.mock("../services/api", () => ({ default: { patch: vi.fn() } }));
vi.mock("../store/authStore", () => ({
  useAuthStore: () => ({ user: { id: "1", name: "Aluno", email: "aluno@example.com" }, updateUser: vi.fn() }),
}));
vi.mock("../contexts/LanguageContext", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));
vi.mock("../components/ui", async (importOriginal) => ({
  ...await importOriginal<typeof import("../components/ui")>(),
  useToast: () => ({ success: vi.fn() }),
}));

async function fillPasswords(confirmation = "new-password") {
  const user = userEvent.setup();
  render(<Settings />);
  await user.click(screen.getByRole("button", { name: "settings.security" }));
  await user.type(screen.getByLabelText("settings.currentPassword"), "current-password");
  await user.type(screen.getByLabelText("settings.newPassword"), "new-password");
  await user.type(screen.getByLabelText("settings.confirmNewPassword"), confirmation);
  return user;
}

describe("Troca de senha", () => {
  beforeEach(() => vi.clearAllMocks());

  it("envia a senha atual e limpa os campos após salvar", async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: null });
    const user = await fillPasswords();
    await user.click(screen.getByRole("button", { name: "settings.updatePassword" }));
    expect(api.patch).toHaveBeenCalledWith("/users/me/password", {
      currentPassword: "current-password", newPassword: "new-password",
    });
    await waitFor(() => expect(screen.getByLabelText("settings.currentPassword")).toHaveValue(""));
    expect(screen.getByLabelText("settings.newPassword")).toHaveValue("");
    expect(screen.getByLabelText("settings.confirmNewPassword")).toHaveValue("");
  });

  it("impede o envio quando a confirmação é diferente", async () => {
    const user = await fillPasswords("different-password");
    await user.click(screen.getByRole("button", { name: "settings.updatePassword" }));
    expect(api.patch).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("settings.passwordMismatch");
  });

  it("mostra a rejeição da senha atual e permite nova tentativa", async () => {
    vi.mocked(api.patch).mockRejectedValue({ response: { status: 400, data: { detail: "Senha atual incorreta." } } });
    const user = await fillPasswords();
    await user.click(screen.getByRole("button", { name: "settings.updatePassword" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Senha atual incorreta.");
    expect(screen.getByLabelText("settings.newPassword")).toHaveValue("new-password");
    expect(screen.getByRole("button", { name: "settings.updatePassword" })).toBeEnabled();
  });

  it("bloqueia envios adicionais enquanto salva", async () => {
    vi.mocked(api.patch).mockReturnValue(new Promise(() => {}));
    const user = await fillPasswords();
    const submit = screen.getByRole("button", { name: "settings.updatePassword" });
    await user.dblClick(submit);
    expect(api.patch).toHaveBeenCalledTimes(1);
    expect(submit).toBeDisabled();
  });
});
