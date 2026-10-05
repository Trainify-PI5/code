import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Settings from "./Settings";
import api from "../services/api";

const { updateUser } = vi.hoisted(() => ({ updateUser: vi.fn() }));
vi.mock("../services/api", () => ({ default: { patch: vi.fn(), get: vi.fn(), put: vi.fn() } }));
vi.mock("../store/authStore", () => ({
  useAuthStore: () => ({ user: { id: "1", name: "Aluno", email: "aluno@example.com" }, updateUser }),
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

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockResolvedValue({ data: { name: "Aluno", bio: "Bio salva" } });
});

describe("Troca de senha", () => {

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

describe("Perfil", () => {
  it("carrega os dados salvos ao abrir a página", async () => {
    render(<Settings />);
    await waitFor(() => expect(screen.getByLabelText('settings.bio')).toHaveValue('Bio salva'));
    expect(screen.getByLabelText('settings.fullName')).toHaveValue('Aluno');
    expect(api.get).toHaveBeenCalledWith('/users/me');
  });

  it("salva nome e bio e atualiza o usuário da interface", async () => {
    vi.mocked(api.put).mockResolvedValue({ data: { name: 'Novo nome', bio: 'Nova bio' } });
    const user = userEvent.setup();
    render(<Settings />);
    const name = screen.getByLabelText('settings.fullName');
    await waitFor(() => expect(name).toBeEnabled());
    await user.clear(name);
    await user.type(name, 'Novo nome');
    await user.clear(screen.getByLabelText('settings.bio'));
    await user.type(screen.getByLabelText('settings.bio'), 'Nova bio');
    await user.click(screen.getByRole('button', { name: 'settings.save' }));
    expect(api.put).toHaveBeenCalledWith('/users/me', { name: 'Novo nome', email: 'aluno@example.com', bio: 'Nova bio' });
    expect(updateUser).toHaveBeenCalledWith({ name: 'Novo nome', bio: 'Nova bio' });
  });

  it("permite apagar a bio", async () => {
    vi.mocked(api.put).mockResolvedValue({ data: { name: 'Aluno', bio: '' } });
    const user = userEvent.setup();
    render(<Settings />);
    await waitFor(() => expect(screen.getByLabelText('settings.bio')).toBeEnabled());
    await user.clear(screen.getByLabelText('settings.bio'));
    await user.click(screen.getByRole('button', { name: 'settings.save' }));
    expect(api.put).toHaveBeenCalledWith('/users/me', expect.objectContaining({ bio: '' }));
    expect(updateUser).toHaveBeenCalledWith({ name: 'Aluno', bio: '' });
  });

  it("preserva a edição se o salvamento falhar", async () => {
    vi.mocked(api.put).mockRejectedValue(new Error('offline'));
    const user = userEvent.setup();
    render(<Settings />);
    await waitFor(() => expect(screen.getByLabelText('settings.bio')).toBeEnabled());
    await user.type(screen.getByLabelText('settings.bio'), ' editada');
    await user.click(screen.getByRole('button', { name: 'settings.save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível atualizar');
    expect(screen.getByLabelText('settings.bio')).toHaveValue('Bio salva editada');
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("impede salvar dados incompletos quando o carregamento falha e permite tentar novamente", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    render(<Settings />);
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'settings.save' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(screen.getByLabelText('settings.bio')).toHaveValue('Bio salva'));
    expect(screen.getByRole('button', { name: 'settings.save' })).toBeEnabled();
  });
});
