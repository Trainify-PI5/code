import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CommandPalette from "./CommandPalette";
import { useAuthStore } from "../store/authStore";

const navegou = vi.fn();
vi.mock("react-router-dom", async () => {
  const real = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...real, useNavigate: () => navegou };
});

vi.mock("../services/api", () => ({
  default: { get: (url: string) => (globalThis as any).__get(url) },
}));

const cursos = [
  { id: "c1", title: "Integração de Novos Colaboradores", description: "Primeiros passos" },
  { id: "c2", title: "Liderança Executiva" },
];
const usuarios = [{ id: "u1", name: "Ana Souza", email: "ana@trainify.com" }];

function definirPerfil(role: string) {
  useAuthStore.setState({
    user: { id: "1", name: "Teste", email: "t@t.com", role } as any,
    isAuthenticated: true,
  });
}

beforeEach(() => {
  navegou.mockClear();
  (globalThis as any).__get = vi.fn((url: string) =>
    Promise.resolve({ data: url === "/courses" ? cursos : usuarios }),
  );
  definirPerfil("ADMIN");
});

function montar(props: Partial<React.ComponentProps<typeof CommandPalette>> = {}) {
  const onClose = vi.fn();
  const utils = render(
    <MemoryRouter>
      <CommandPalette open onClose={onClose} {...props} />
    </MemoryRouter>,
  );
  return { ...utils, onClose };
}

const campo = () => screen.getByRole("combobox");
const opcoes = () => screen.queryAllByRole("option");
const selecionada = () => opcoes().find((o) => o.getAttribute("aria-selected") === "true");

describe("CommandPalette — abertura", () => {
  it("não renderiza nada quando fechada", () => {
    render(
      <MemoryRouter>
        <CommandPalette open={false} onClose={() => {}} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("é um diálogo com nome acessível", () => {
    montar();
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Paleta de comandos");
  });

  it("lista a navegação já na abertura, sem digitar nada", () => {
    montar();
    expect(screen.getByText("Ir para")).toBeInTheDocument();
    expect(opcoes().length).toBeGreaterThan(0);
  });

  it("seleciona o primeiro item, que é o que o Enter executa", () => {
    montar();
    expect(selecionada()).toBe(opcoes()[0]);
  });
});

describe("CommandPalette — busca", () => {
  it("filtra pelo que foi digitado", () => {
    montar();
    fireEvent.change(campo(), { target: { value: "certific" } });
    expect(opcoes()).toHaveLength(1);
    expect(opcoes()[0]).toHaveTextContent("Certificados");
  });

  it("acha ignorando acento", () => {
    montar();
    fireEvent.change(campo(), { target: { value: "notificacoes" } });
    expect(opcoes()[0]).toHaveTextContent("Notificações");
  });

  it("acha por sinônimo que não está escrito na tela", () => {
    montar();
    fireEvent.change(campo(), { target: { value: "metricas" } });
    expect(opcoes()[0]).toHaveTextContent("Dashboards");
  });

  it("explica quando não encontra, em vez de ficar em branco", () => {
    montar();
    fireEvent.change(campo(), { target: { value: "zzzzzz" } });
    expect(opcoes()).toHaveLength(0);
    expect(screen.getByText(/Nada encontrado/)).toBeInTheDocument();
  });

  it("volta a seleção para o topo a cada tecla digitada", () => {
    montar();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowDown" });
    expect(selecionada()).toBe(opcoes()[1]);

    fireEvent.change(campo(), { target: { value: "c" } });
    expect(selecionada()).toBe(opcoes()[0]);
  });

  it("encontra cursos vindos da API", async () => {
    montar();
    await waitFor(() => expect(screen.getByText("Cursos", { selector: "p" })).toBeInTheDocument());
    fireEvent.change(campo(), { target: { value: "integra" } });
    await waitFor(() =>
      expect(screen.getByText("Integração de Novos Colaboradores")).toBeInTheDocument(),
    );
  });

  it("encontra usuário pelo e-mail", async () => {
    montar();
    await waitFor(() => expect((globalThis as any).__get).toHaveBeenCalledWith("/users"));
    fireEvent.change(campo(), { target: { value: "ana@trainify" } });
    await waitFor(() => expect(screen.getByText("Ana Souza")).toBeInTheDocument());
  });
});

describe("CommandPalette — teclado", () => {
  const dialogo = () => screen.getByRole("dialog");

  it("desce e sobe com as setas", () => {
    montar();
    fireEvent.keyDown(dialogo(), { key: "ArrowDown" });
    expect(selecionada()).toBe(opcoes()[1]);

    fireEvent.keyDown(dialogo(), { key: "ArrowUp" });
    expect(selecionada()).toBe(opcoes()[0]);
  });

  it("dá a volta nas duas pontas", () => {
    montar();
    fireEvent.keyDown(dialogo(), { key: "ArrowUp" });
    expect(selecionada()).toBe(opcoes()[opcoes().length - 1]);

    fireEvent.keyDown(dialogo(), { key: "ArrowDown" });
    expect(selecionada()).toBe(opcoes()[0]);
  });

  it("Home e End vão para as pontas", () => {
    montar();
    fireEvent.keyDown(dialogo(), { key: "End" });
    expect(selecionada()).toBe(opcoes()[opcoes().length - 1]);

    fireEvent.keyDown(dialogo(), { key: "Home" });
    expect(selecionada()).toBe(opcoes()[0]);
  });

  it("Enter executa o item selecionado", () => {
    const { onClose } = montar();
    fireEvent.change(campo(), { target: { value: "auditoria" } });
    fireEvent.keyDown(dialogo(), { key: "Enter" });

    expect(navegou).toHaveBeenCalledWith("/audit-logs");
    expect(onClose).toHaveBeenCalled();
  });

  it("Esc fecha", () => {
    const { onClose } = montar();
    fireEvent.keyDown(dialogo(), { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("Enter sem resultado não navega para lugar nenhum", () => {
    montar();
    fireEvent.change(campo(), { target: { value: "zzzzzz" } });
    fireEvent.keyDown(dialogo(), { key: "Enter" });
    expect(navegou).not.toHaveBeenCalled();
  });

  it("aponta o item ativo por aria-activedescendant", () => {
    montar();
    const id = campo().getAttribute("aria-activedescendant");
    expect(id).toBeTruthy();
    expect(selecionada()).toHaveAttribute("id", id!);
  });
});

describe("CommandPalette — mouse", () => {
  it("clicar executa o item", () => {
    const { onClose } = montar();
    fireEvent.change(campo(), { target: { value: "suporte" } });
    fireEvent.click(opcoes()[0]);

    expect(navegou).toHaveBeenCalledWith("/support");
    expect(onClose).toHaveBeenCalled();
  });

  it("passar o mouse só muda a seleção, não executa", () => {
    montar();
    fireEvent.mouseMove(opcoes()[2]);
    expect(selecionada()).toBe(opcoes()[2]);
    expect(navegou).not.toHaveBeenCalled();
  });
});

describe("CommandPalette — regras de perfil", () => {
  // oferecer atalho para uma tela bloqueada so levaria a pessoa a /unauthorized
  const titulos = () => opcoes().map((o) => o.textContent);

  it("aluno não vê Dashboards, Usuários, Empresa nem Auditoria", async () => {
    definirPerfil("STUDENT");
    montar();
    const texto = titulos().join(" ");
    expect(texto).not.toMatch(/Dashboards|Usuários|Empresa|Auditoria|Criar Curso/);
    expect(texto).toMatch(/Cursos/);
  });

  it("aluno não tem a lista de usuários nem é buscada da API", async () => {
    definirPerfil("STUDENT");
    montar();
    await waitFor(() => expect((globalThis as any).__get).toHaveBeenCalledWith("/courses"));
    expect((globalThis as any).__get).not.toHaveBeenCalledWith("/users");
  });

  it("gestor vê Dashboards e Usuários, mas não Auditoria", () => {
    definirPerfil("MANAGER");
    montar();
    const texto = titulos().join(" ");
    expect(texto).toMatch(/Dashboards/);
    expect(texto).toMatch(/Usuários/);
    expect(texto).not.toMatch(/Auditoria/);
  });

  it("instrutor vê Criar Curso", () => {
    definirPerfil("INSTRUCTOR");
    montar();
    expect(titulos().join(" ")).toMatch(/Criar Curso/);
  });

  it("admin vê tudo", () => {
    definirPerfil("ADMIN");
    montar();
    const texto = titulos().join(" ");
    expect(texto).toMatch(/Dashboards/);
    expect(texto).toMatch(/Auditoria/);
    expect(texto).toMatch(/Empresa/);
  });
});

describe("CommandPalette — ações", () => {
  it("oferece trocar o tema e o rótulo acompanha o tema atual", () => {
    montar();
    fireEvent.change(campo(), { target: { value: "tema" } });
    const secao = screen.getByText("Ações");
    expect(secao).toBeInTheDocument();
    expect(opcoes()[0]).toHaveTextContent(/Mudar para o tema escuro/);
  });

  it("trocar o tema aplica e fecha", () => {
    const { onClose } = montar();
    fireEvent.change(campo(), { target: { value: "tema" } });
    fireEvent.click(opcoes()[0]);

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(onClose).toHaveBeenCalled();
  });
});

describe("CommandPalette — carga dos dados", () => {
  it("busca cursos e usuários uma vez só, mesmo reabrindo", async () => {
    const { rerender, onClose } = montar();
    await waitFor(() => expect((globalThis as any).__get).toHaveBeenCalledTimes(2));

    rerender(
      <MemoryRouter>
        <CommandPalette open={false} onClose={onClose} />
      </MemoryRouter>,
    );
    rerender(
      <MemoryRouter>
        <CommandPalette open onClose={onClose} />
      </MemoryRouter>,
    );

    expect((globalThis as any).__get).toHaveBeenCalledTimes(2);
  });

  it("segue utilizável quando a API falha", async () => {
    (globalThis as any).__get = vi.fn(() => Promise.reject(new Error("offline")));
    montar();
    await waitFor(() => expect((globalThis as any).__get).toHaveBeenCalled());
    expect(opcoes().length).toBeGreaterThan(0);
  });

  it("limpa o termo a cada abertura", () => {
    const { rerender, onClose } = montar();
    fireEvent.change(campo(), { target: { value: "auditoria" } });
    expect(campo()).toHaveValue("auditoria");

    rerender(
      <MemoryRouter>
        <CommandPalette open={false} onClose={onClose} />
      </MemoryRouter>,
    );
    rerender(
      <MemoryRouter>
        <CommandPalette open onClose={onClose} />
      </MemoryRouter>,
    );

    expect(campo()).toHaveValue("");
  });
});
