import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DataTable, { type Coluna } from "./DataTable";

interface Aluno {
  id: string;
  nome: string;
  nota: number | null;
}

const alunos: Aluno[] = [
  { id: "1", nome: "Carla", nota: 70 },
  { id: "2", nome: "Ana", nota: 100 },
  { id: "3", nome: "Bruno", nota: null },
];

const colunas: Coluna<Aluno>[] = [
  { key: "nome", header: "Nome", sortValue: (a) => a.nome, render: (a) => a.nome },
  { key: "nota", header: "Nota", sortValue: (a) => a.nota, render: (a) => String(a.nota ?? "--") },
  { key: "acoes", header: "Ações", render: () => <button>Editar</button> },
];

function montar(props: Partial<React.ComponentProps<typeof DataTable<Aluno>>> = {}) {
  return render(
    <DataTable columns={colunas} rows={alunos} rowKey={(a) => a.id} {...props} />,
  );
}

const nomesVisiveis = () =>
  within(screen.getByRole("table"))
    .getAllByRole("row")
    .slice(1)
    .map((linha) => linha.querySelector("td")?.textContent);

describe("DataTable — estrutura", () => {
  it("mostra uma linha por registro", () => {
    montar();
    expect(nomesVisiveis()).toHaveLength(3);
  });

  it("usa rowKey, então registros com o mesmo texto não colidem", () => {
    const repetidos = [
      { id: "a", nome: "Ana", nota: 10 },
      { id: "b", nome: "Ana", nota: 10 },
    ];
    montar({ rows: repetidos });
    expect(nomesVisiveis()).toHaveLength(2);
  });

  it("mostra a mensagem de vazio quando não há registros", () => {
    montar({ rows: [], emptyMessage: "Nenhum aluno." });
    expect(screen.getByText("Nenhum aluno.")).toBeInTheDocument();
  });

  it("mostra esqueleto no lugar dos dados enquanto carrega", () => {
    montar({ loading: true, skeletonRows: 4 });
    expect(screen.getAllByTestId("skeleton-row")).toHaveLength(4);
    expect(screen.queryByText("Ana")).toBeNull();
  });

  it("anuncia o carregamento por aria-busy, já que o esqueleto fica oculto", () => {
    montar({ loading: true });
    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true");
  });

  it("não mostra o vazio enquanto ainda está carregando", () => {
    montar({ rows: [], loading: true, emptyMessage: "Nenhum aluno." });
    expect(screen.queryByText("Nenhum aluno.")).toBeNull();
  });
});

describe("DataTable — ordenação", () => {
  it("só oferece botão nas colunas que têm sortValue", () => {
    montar();
    expect(screen.getByRole("button", { name: /Nome/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Ações$/ })).toBeNull();
  });

  it("ordena ascendente no primeiro clique", () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: /Nome/ }));
    expect(nomesVisiveis()).toEqual(["Ana", "Bruno", "Carla"]);
  });

  it("inverte no segundo clique na mesma coluna", () => {
    montar();
    const botao = screen.getByRole("button", { name: /Nome/ });
    fireEvent.click(botao);
    fireEvent.click(botao);
    expect(nomesVisiveis()).toEqual(["Carla", "Bruno", "Ana"]);
  });

  it("recomeça em ascendente ao trocar de coluna", () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: /Nome/ }));
    fireEvent.click(screen.getByRole("button", { name: /Nome/ }));
    fireEvent.click(screen.getByRole("button", { name: /Nota/ }));
    // nota nula vai para o fim, nas duas direcoes
    expect(nomesVisiveis()).toEqual(["Carla", "Ana", "Bruno"]);
  });

  it("publica a direção em aria-sort, para o leitor de tela anunciar", () => {
    montar();
    const coluna = () => screen.getByRole("columnheader", { name: /Nome/ });
    expect(coluna()).toHaveAttribute("aria-sort", "none");

    fireEvent.click(screen.getByRole("button", { name: /Nome/ }));
    expect(coluna()).toHaveAttribute("aria-sort", "ascending");

    fireEvent.click(screen.getByRole("button", { name: /Nome/ }));
    expect(coluna()).toHaveAttribute("aria-sort", "descending");
  });

  it("coluna sem ordenação não recebe aria-sort", () => {
    montar();
    expect(screen.getByRole("columnheader", { name: "Ações" })).not.toHaveAttribute("aria-sort");
  });

  it("respeita a ordenação inicial", () => {
    montar({ initialSort: { key: "nome", direcao: "desc" } });
    expect(nomesVisiveis()).toEqual(["Carla", "Bruno", "Ana"]);
  });

  it("não altera o array de linhas recebido", () => {
    const original = [...alunos];
    montar();
    fireEvent.click(screen.getByRole("button", { name: /Nome/ }));
    expect(alunos).toEqual(original);
  });
});

describe("DataTable — paginação", () => {
  const muitos = Array.from({ length: 25 }, (_, i) => ({
    id: String(i),
    nome: `Aluno ${String(i + 1).padStart(2, "0")}`,
    nota: i,
  }));

  it("mostra só a primeira página", () => {
    montar({ rows: muitos, pageSize: 10 });
    expect(nomesVisiveis()).toHaveLength(10);
    expect(screen.getByText("Mostrando 1–10 de 25")).toBeInTheDocument();
  });

  it("navega para outra página", () => {
    montar({ rows: muitos, pageSize: 10 });
    fireEvent.click(screen.getByRole("button", { name: "Página 3" }));
    expect(nomesVisiveis()).toHaveLength(5);
    expect(screen.getByText("Mostrando 21–25 de 25")).toBeInTheDocument();
  });

  it("marca a página atual para o leitor de tela", () => {
    montar({ rows: muitos, pageSize: 10 });
    expect(screen.getByRole("button", { name: "Página 1" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("desabilita anterior na primeira e próxima na última", () => {
    montar({ rows: muitos, pageSize: 10 });
    expect(screen.getByRole("button", { name: "Página anterior" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Página 3" }));
    expect(screen.getByRole("button", { name: "Próxima página" })).toBeDisabled();
  });

  it("esconde o rodapé quando tudo cabe numa página só", () => {
    montar({ rows: muitos.slice(0, 5), pageSize: 10 });
    expect(screen.queryByRole("navigation", { name: "Paginação" })).toBeNull();
  });

  it("pageSize 0 desliga a paginação", () => {
    montar({ rows: muitos, pageSize: 0 });
    expect(nomesVisiveis()).toHaveLength(25);
    expect(screen.queryByRole("navigation", { name: "Paginação" })).toBeNull();
  });

  it("volta para a primeira página ao reordenar", () => {
    montar({ rows: muitos, pageSize: 10 });
    fireEvent.click(screen.getByRole("button", { name: "Página 3" }));
    fireEvent.click(screen.getByRole("button", { name: /Nome/ }));
    expect(screen.getByText("Mostrando 1–10 de 25")).toBeInTheDocument();
  });

  it("não deixa a página presa fora do intervalo quando a lista encolhe", () => {
    const { rerender } = montar({ rows: muitos, pageSize: 10 });
    fireEvent.click(screen.getByRole("button", { name: "Página 3" }));

    // um filtro externo reduz a lista para 4 registros
    rerender(
      <DataTable
        columns={colunas}
        rows={muitos.slice(0, 4)}
        rowKey={(a) => a.id}
        pageSize={10}
      />,
    );
    expect(nomesVisiveis()).toHaveLength(4);
  });
});

describe("DataTable — celular", () => {
  it("troca a tabela por cartões abaixo de md", () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;

    montar();
    expect(screen.queryByRole("table")).toBeNull();
    // cada cartao repete o rotulo da coluna junto do valor
    expect(screen.getAllByText("Nome")).toHaveLength(3);
    expect(screen.getByText("Carla")).toBeInTheDocument();

    window.matchMedia = original;
  });

  it("o rótulo some nas colunas marcadas com hideLabelOnMobile", () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;

    const comAcoesOcultas = colunas.map((c) =>
      c.key === "acoes" ? { ...c, hideLabelOnMobile: true } : c,
    );
    render(
      <DataTable columns={comAcoesOcultas} rows={alunos} rowKey={(a) => a.id} />,
    );
    expect(screen.queryByText("Ações")).toBeNull();
    expect(screen.getAllByRole("button", { name: "Editar" })).toHaveLength(3);

    window.matchMedia = original;
  });
});
