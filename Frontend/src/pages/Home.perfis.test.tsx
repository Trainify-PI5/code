import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./Home";
import api from "../services/api";

vi.mock("../services/api", () => ({ default: { get: vi.fn() } }));
vi.mock("../contexts/LanguageContext", () => ({
  useLanguage: () => ({ t: (chave: string) => chave }),
}));

const perfilAtual = { role: "STUDENT", name: "Pedro Souza", id: "usuario-1" };
vi.mock("../store/authStore", () => ({
  useAuthStore: () => ({ user: perfilAtual }),
}));

/**
 * A tela inicial era a mesma para todos e falava de "suas atividades de
 * aprendizado" até para quem administra a empresa.
 */
describe("tela inicial por perfil", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  function respondeApi(resumo: any, cursos: any[] = []) {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === "/home/summary") return { data: resumo } as any;
      if (url.startsWith("/courses")) return { data: cursos } as any;
      return { data: [] } as any;
    });
  }

  it("mostra ao aluno o texto e os números de quem estuda", async () => {
    perfilAtual.role = "STUDENT";
    respondeApi({
      role: "STUDENT",
      userName: "Pedro Souza",
      headline: "Bons estudos",
      subtitle: "Continue de onde parou e conquiste seus certificados.",
      cards: [{ label: "Certificados", value: 2, link: "certifications" }],
    });

    render(<MemoryRouter><Home /></MemoryRouter>);

    expect(await screen.findByText("Bons estudos")).toBeInTheDocument();
    expect(screen.getByText("Certificados")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    // O aluno vê o que está publicado, não a lista de rascunhos
    expect(vi.mocked(api.get).mock.calls.map((c) => c[0])).toContain("/courses");
  });

  it("mostra ao admin a conversa de gestão, não a de aprendizado", async () => {
    perfilAtual.role = "ADMIN";
    respondeApi({
      role: "ADMIN",
      userName: "Ana Martins",
      headline: "Sua empresa",
      subtitle: "Gerencie as pessoas, os convites e o conteúdo disponível.",
      cards: [
        { label: "Pessoas ativas", value: 11, link: "users" },
        { label: "Convites pendentes", value: 3, link: "invitations" },
      ],
    });

    render(<MemoryRouter><Home /></MemoryRouter>);

    expect(await screen.findByText("Sua empresa")).toBeInTheDocument();
    expect(screen.getByText("Convites pendentes")).toBeInTheDocument();
    expect(screen.queryByText("Bons estudos")).not.toBeInTheDocument();
  });

  it("mostra ao instrutor os próprios cursos, inclusive rascunhos", async () => {
    perfilAtual.role = "INSTRUCTOR";
    respondeApi(
      {
        role: "INSTRUCTOR",
        userName: "Juliana",
        headline: "Seus cursos",
        subtitle: "Continue de onde parou.",
        cards: [{ label: "Rascunhos", value: 1, link: "courses" }],
      },
      [{ id: "c1", title: "Integração", description: "Curso novo", status: "DRAFT", instructor: { id: "usuario-1" } },
       { id: "c2", title: "Curso de outra pessoa", description: "Não é dele", status: "PUBLISHED", instructor: { id: "outro" } }]
    );

    render(<MemoryRouter><Home /></MemoryRouter>);

    expect(await screen.findByText("Cursos que você criou")).toBeInTheDocument();
    expect(screen.getByText("Integração")).toBeInTheDocument();
    expect(screen.getByText("Rascunho")).toBeInTheDocument();
    // A lista mostra só os cursos dele
    expect(screen.queryByText("Curso de outra pessoa")).not.toBeInTheDocument();
    expect(vi.mocked(api.get).mock.calls.map((c) => c[0])).toContain("/courses/all");
  });

  it("não quebra se o resumo não vier", async () => {
    perfilAtual.role = "STUDENT";
    respondeApi({ role: "STUDENT", userName: "Pedro", headline: "Bons estudos", subtitle: "" });

    render(<MemoryRouter><Home /></MemoryRouter>);

    expect(await screen.findByText("Bons estudos")).toBeInTheDocument();
  });
});
