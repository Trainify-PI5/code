import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PageHeader from "./PageHeader";
import PageContainer from "./PageContainer";
import Skeleton, {
  SkeletonCards,
  SkeletonTableRows,
  SkeletonText,
} from "./Skeleton";

describe("PageHeader", () => {
  it("publica o título como h1 — uma página tem um só", () => {
    render(<PageHeader title="Gestão de Usuários" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Gestão de Usuários");
  });

  it("mostra o subtítulo quando existe", () => {
    render(<PageHeader title="Usuários" subtitle="Administre os acessos." />);
    expect(screen.getByText("Administre os acessos.")).toBeInTheDocument();
  });

  it("não deixa um parágrafo vazio quando não há subtítulo", () => {
    const { container } = render(<PageHeader title="Usuários" />);
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });

  it("aceita ações e as mantém fora do título", () => {
    render(<PageHeader title="Usuários" actions={<button>Novo Usuário</button>} />);
    const titulo = screen.getByRole("heading", { level: 1 });
    const botao = screen.getByRole("button", { name: "Novo Usuário" });
    expect(botao).toBeInTheDocument();
    expect(within(titulo).queryByRole("button")).toBeNull();
  });

  it("desenha a divisória por padrão e a remove quando pedido", () => {
    const { container, rerender } = render(<PageHeader title="A" />);
    expect(container.firstElementChild?.className).toContain("border-b");

    rerender(<PageHeader title="A" divider={false} />);
    expect(container.firstElementChild?.className).not.toContain("border-b");
  });

  it("empilha no celular e alinha em linha a partir do sm", () => {
    const { container } = render(<PageHeader title="A" actions={<button>B</button>} />);
    const classes = container.firstElementChild?.className ?? "";
    expect(classes).toContain("flex-col");
    expect(classes).toContain("sm:flex-row");
  });

  it("as ações não encolhem quando o título é longo", () => {
    render(<PageHeader title={"Título ".repeat(20)} actions={<button>Ação</button>} />);
    const caixa = screen.getByRole("button", { name: "Ação" }).parentElement;
    expect(caixa?.className).toContain("shrink-0");
  });
});

describe("Skeleton", () => {
  it("fica fora do alcance do leitor de tela — é decorativo", () => {
    render(<Skeleton />);
    expect(screen.getByTestId("skeleton")).toHaveAttribute("aria-hidden", "true");
  });

  it("respeita quem pediu menos animação no sistema", () => {
    render(<Skeleton />);
    expect(screen.getByTestId("skeleton").className).toContain("motion-reduce:animate-none");
  });

  it("aceita medidas por className, para imitar o conteúdo real", () => {
    render(<Skeleton className="h-40 w-full" />);
    const el = screen.getByTestId("skeleton");
    expect(el.className).toContain("h-40");
    expect(el.className).toContain("w-full");
  });
});

describe("SkeletonText", () => {
  it("desenha a quantidade de linhas pedida", () => {
    render(<SkeletonText lines={4} />);
    expect(screen.getAllByTestId("skeleton")).toHaveLength(4);
  });

  it("deixa a última linha mais curta, como um parágrafo de verdade", () => {
    render(<SkeletonText lines={3} />);
    const linhas = screen.getAllByTestId("skeleton");
    expect(linhas[0].className).toContain("w-full");
    expect(linhas[2].className).toContain("w-2/3");
  });
});

describe("SkeletonTableRows", () => {
  // precisa devolver <tr> soltos: um <div> dentro de <tbody> e HTML invalido
  const montar = (props = {}) =>
    render(
      <table>
        <tbody>
          <SkeletonTableRows {...props} />
        </tbody>
      </table>,
    );

  it("gera linhas e colunas na quantidade pedida", () => {
    montar({ rows: 3, columns: 5 });
    const linhas = screen.getAllByTestId("skeleton-row");
    expect(linhas).toHaveLength(3);
    expect(linhas[0].querySelectorAll("td")).toHaveLength(5);
  });

  it("produz <tr> direto, sem embrulho que quebraria a tabela", () => {
    const { container } = montar({ rows: 2, columns: 2 });
    const corpo = container.querySelector("tbody");
    expect([...(corpo?.children ?? [])].every((f) => f.tagName === "TR")).toBe(true);
  });

  it("dá mais largura à primeira coluna, onde costuma ficar o nome", () => {
    montar({ rows: 1, columns: 3 });
    const celulas = screen.getByTestId("skeleton-row").querySelectorAll("td");
    expect(celulas[0].firstElementChild?.className).toContain("w-40");
    expect(celulas[1].firstElementChild?.className).toContain("w-20");
  });
});

describe("SkeletonCards", () => {
  it("desenha a quantidade de cartões pedida", () => {
    const { container } = render(<SkeletonCards count={6} />);
    // cada cartao traz a capa mais o titulo mais duas linhas de texto
    expect(container.children).toHaveLength(6);
  });

  it("cada cartão imita capa, título e texto", () => {
    render(<SkeletonCards count={1} />);
    expect(screen.getAllByTestId("skeleton")).toHaveLength(4);
  });
});

describe("SkeletonTableRows com avatar", () => {
  const montar = (props = {}) =>
    render(
      <table>
        <tbody>
          <SkeletonTableRows {...props} />
        </tbody>
      </table>,
    );

  it("imita foto e duas linhas na primeira coluna", () => {
    montar({ rows: 1, columns: 3, avatar: true });
    const primeira = screen.getByTestId("skeleton-row").querySelectorAll("td")[0];
    const blocos = primeira.querySelectorAll('[data-testid="skeleton"]');
    expect(blocos).toHaveLength(3);
    expect(blocos[0].className).toContain("rounded-full");
  });

  it("as demais colunas continuam sendo uma linha só", () => {
    montar({ rows: 1, columns: 3, avatar: true });
    const celulas = screen.getByTestId("skeleton-row").querySelectorAll("td");
    expect(celulas[1].querySelectorAll('[data-testid="skeleton"]')).toHaveLength(1);
  });

  it("sem avatar a primeira coluna volta a ser uma linha só", () => {
    montar({ rows: 1, columns: 3 });
    const primeira = screen.getByTestId("skeleton-row").querySelectorAll("td")[0];
    expect(primeira.querySelectorAll('[data-testid="skeleton"]')).toHaveLength(1);
  });
});

describe("PageContainer", () => {
  it("usa a largura padrão quando nada é pedido", () => {
    const { container } = render(<PageContainer>conteúdo</PageContainer>);
    expect(container.firstElementChild?.className).toContain("max-w-5xl");
  });

  it("estreita para leitura e alarga para tabela", () => {
    const { container, rerender } = render(<PageContainer width="narrow">a</PageContainer>);
    expect(container.firstElementChild?.className).toContain("max-w-3xl");

    rerender(<PageContainer width="wide">a</PageContainer>);
    expect(container.firstElementChild?.className).toContain("max-w-7xl");
  });

  it("centraliza e mantém o mesmo respiro vertical em todas as telas", () => {
    const { container } = render(<PageContainer>a</PageContainer>);
    const classes = container.firstElementChild?.className ?? "";
    expect(classes).toContain("mx-auto");
    expect(classes).toContain("space-y-8");
  });

  it("não aplica recuo próprio — quem recua é o layout, uma vez só", () => {
    // tres paginas repetiam o p-8 do <main> e ficavam com o dobro do recuo
    const { container } = render(<PageContainer>a</PageContainer>);
    const classes = container.firstElementChild?.className ?? "";
    expect(classes).not.toMatch(/\bp-\d/);
    expect(classes).not.toMatch(/\bpx-\d/);
  });

  it("aceita classe extra sem perder a largura", () => {
    const { container } = render(
      <PageContainer width="wide" className="pb-24">
        a
      </PageContainer>,
    );
    const classes = container.firstElementChild?.className ?? "";
    expect(classes).toContain("max-w-7xl");
    expect(classes).toContain("pb-24");
  });

  it("não deixa o conteúdo estourar num container flex", () => {
    const { container } = render(<PageContainer>a</PageContainer>);
    expect(container.firstElementChild?.className).toContain("min-w-0");
  });
});
