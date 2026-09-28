import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Analytics from "./Analytics";
import { LanguageProvider } from "../contexts/LanguageContext";
import { ToastProvider } from "../components/ui";

// A tela busca varios endpoints; aqui so importam os que alimentam a tabela.
vi.mock("../services/api", () => ({
  default: { get: (...args: unknown[]) => (globalThis as any).__get(...args) },
}));

const matriculas = [
  {
    status: "IN_PROGRESS",
    progressPercentage: 40,
    user: { name: "Ana Souza", email: "ana@trainify.com" },
    course: { id: "c1", title: "Comunicação Eficaz" },
  },
  {
    status: "COMPLETED",
    progressPercentage: 100,
    user: { name: "João Pereira", email: "joao@trainify.com" },
    course: { id: "c1", title: "Comunicação Eficaz" },
  },
  {
    status: "COMPLETED",
    progressPercentage: 100,
    user: { name: "Bruno Lima", email: "bruno@trainify.com" },
    course: { id: "c2", title: "Liderança" },
  },
];

function resposta(url: string) {
  if (url === "/enrollments/all") return { data: matriculas };
  if (url === "/analytics/kpis")
    return { data: { totalUsers: 3, totalCourses: 2, activeEnrollments: 1, completedEnrollments: 2 } };
  return { data: [] };
}

beforeEach(() => {
  (globalThis as any).__get = vi.fn((url: string) => Promise.resolve(resposta(url)));
});

function montar() {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <ToastProvider>
          <Analytics />
        </ToastProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );
}

const tabela = () => screen.getByRole("table");
const alunosNaTabela = () =>
  within(tabela())
    .getAllByRole("row")
    .slice(1)
    // a primeira celula tem a bolinha das iniciais antes do nome
    .map((linha) => linha.querySelector("td span")?.textContent?.trim())
    .filter(Boolean);

async function abrirFiltros() {
  fireEvent.click(screen.getByRole("button", { name: /filtrar dados/i }));
  return screen.findByRole("dialog");
}

describe("Analytics — filtrar dados", () => {
  it("lista todas as matrículas antes de qualquer filtro", async () => {
    montar();
    await waitFor(() => expect(alunosNaTabela()).toHaveLength(3));
  });

  it("abre o modal de filtros com os cursos que existem na tabela", async () => {
    montar();
    await waitFor(() => expect(alunosNaTabela()).toHaveLength(3));

    const dialog = await abrirFiltros();
    const curso = within(dialog).getByLabelText(/curso/i) as HTMLSelectElement;
    expect([...curso.options].map((o) => o.textContent)).toEqual([
      "Todos",
      "Comunicação Eficaz",
      "Liderança",
    ]);
  });

  it("filtra a tabela por curso só depois de aplicar", async () => {
    montar();
    await waitFor(() => expect(alunosNaTabela()).toHaveLength(3));

    const dialog = await abrirFiltros();
    fireEvent.change(within(dialog).getByLabelText(/curso/i), { target: { value: "c2" } });
    // ainda nao aplicou: a tabela nao pode ter mudado
    expect(alunosNaTabela()).toHaveLength(3);

    fireEvent.click(within(dialog).getByRole("button", { name: /aplicar/i }));
    await waitFor(() => expect(alunosNaTabela()).toEqual(["Bruno Lima"]));
  });

  it("combina curso e situação", async () => {
    montar();
    await waitFor(() => expect(alunosNaTabela()).toHaveLength(3));

    const dialog = await abrirFiltros();
    fireEvent.change(within(dialog).getByLabelText(/curso/i), { target: { value: "c1" } });
    fireEvent.change(within(dialog).getByLabelText(/situação/i), {
      target: { value: "COMPLETED" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /aplicar/i }));

    await waitFor(() => expect(alunosNaTabela()).toEqual(["João Pereira"]));
  });

  it("busca aluno ignorando acento", async () => {
    montar();
    await waitFor(() => expect(alunosNaTabela()).toHaveLength(3));

    const dialog = await abrirFiltros();
    fireEvent.change(within(dialog).getByLabelText(/aluno/i), { target: { value: "joao" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /aplicar/i }));

    await waitFor(() => expect(alunosNaTabela()).toEqual(["João Pereira"]));
  });

  it("mostra aviso, e não tabela vazia sem explicação, quando nada combina", async () => {
    montar();
    await waitFor(() => expect(alunosNaTabela()).toHaveLength(3));

    const dialog = await abrirFiltros();
    fireEvent.change(within(dialog).getByLabelText(/aluno/i), { target: { value: "ninguem" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /aplicar/i }));

    await screen.findByText(/nenhuma matrícula corresponde/i);
  });

  it("mostra quantos filtros estão ativos e quantas linhas sobraram", async () => {
    montar();
    await waitFor(() => expect(alunosNaTabela()).toHaveLength(3));

    const dialog = await abrirFiltros();
    fireEvent.change(within(dialog).getByLabelText(/curso/i), { target: { value: "c1" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /aplicar/i }));

    await screen.findByText(/2\/3 · 1 filtro/i);
  });

  it("limpa os filtros e volta a lista inteira", async () => {
    montar();
    await waitFor(() => expect(alunosNaTabela()).toHaveLength(3));

    let dialog = await abrirFiltros();
    fireEvent.change(within(dialog).getByLabelText(/curso/i), { target: { value: "c2" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /aplicar/i }));
    await waitFor(() => expect(alunosNaTabela()).toEqual(["Bruno Lima"]));

    dialog = await abrirFiltros();
    fireEvent.click(within(dialog).getByRole("button", { name: /limpar filtros/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /aplicar/i }));
    await waitFor(() => expect(alunosNaTabela()).toHaveLength(3));
  });

  it("descarta o que foi mexido quando o modal é fechado sem aplicar", async () => {
    montar();
    await waitFor(() => expect(alunosNaTabela()).toHaveLength(3));

    let dialog = await abrirFiltros();
    fireEvent.change(within(dialog).getByLabelText(/curso/i), { target: { value: "c2" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /fechar/i }));
    expect(alunosNaTabela()).toHaveLength(3);

    dialog = await abrirFiltros();
    expect((within(dialog).getByLabelText(/curso/i) as HTMLSelectElement).value).toBe("");
  });

  it("exporta apenas as linhas que passam pelo filtro", async () => {
    montar();
    await waitFor(() => expect(alunosNaTabela()).toHaveLength(3));

    const relatorio = [
      { studentName: "Ana Souza", courseId: "c1", courseTitle: "Comunicação Eficaz", status: "IN_PROGRESS" },
      { studentName: "Bruno Lima", courseId: "c2", courseTitle: "Liderança", status: "COMPLETED" },
    ];
    (globalThis as any).__get = vi.fn((url: string) =>
      url === "/analytics/report" ? Promise.resolve({ data: relatorio }) : Promise.resolve(resposta(url)),
    );

    URL.createObjectURL = vi.fn(() => "blob:fake");
    URL.revokeObjectURL = vi.fn();

    const dialog = await abrirFiltros();
    fireEvent.change(within(dialog).getByLabelText(/curso/i), { target: { value: "c2" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /aplicar/i }));

    fireEvent.click(screen.getByRole("button", { name: /exportar/i }));
    await screen.findByText(/1 matrícula\(s\) exportada\(s\)/i);
  });

  it("avisa em vez de baixar arquivo vazio quando o filtro não pega nada", async () => {
    montar();
    await waitFor(() => expect(alunosNaTabela()).toHaveLength(3));

    (globalThis as any).__get = vi.fn((url: string) =>
      url === "/analytics/report"
        ? Promise.resolve({ data: [{ studentName: "Ana Souza", courseId: "c1", status: "IN_PROGRESS" }] })
        : Promise.resolve(resposta(url)),
    );

    const dialog = await abrirFiltros();
    fireEvent.change(within(dialog).getByLabelText(/curso/i), { target: { value: "c2" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /aplicar/i }));

    fireEvent.click(screen.getByRole("button", { name: /exportar/i }));
    await screen.findByText(/nenhuma matrícula corresponde/i);
  });
});
