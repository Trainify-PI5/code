import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Alert, Badge, Button, Card, Input } from "./index";

describe("Button", () => {
  it("usa a variante primária e o tamanho médio por padrão", () => {
    render(<Button>Salvar</Button>);
    const btn = screen.getByRole("button", { name: "Salvar" });
    expect(btn).toHaveClass("bg-primary-container", "text-white", "px-4", "py-2");
  });

  it('nasce com type="button" para não submeter formulários sem querer', () => {
    render(<Button>Cancelar</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("aceita type=submit quando explicitamente pedido", () => {
    render(<Button type="submit">Enviar</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("dispara onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Clique</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("não dispara onClick quando desabilitado", async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Clique
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("nunca usa bg-primary puro, que deixaria o texto branco ilegível no escuro", () => {
    render(<Button>Salvar</Button>);
    const classes = screen.getByRole("button").className;
    expect(classes).toContain("bg-primary-container");
    // lookahead: "bg-primary" isolado, sem o sufixo "-container"
    expect(classes).not.toMatch(/\bbg-primary(?![-\w])/);
  });

  it("aplica largura total sob demanda", () => {
    render(<Button fullWidth>Entrar</Button>);
    expect(screen.getByRole("button")).toHaveClass("w-full");
  });

  it("mescla className sem perder o estilo base", () => {
    render(<Button className="mt-4">Salvar</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("mt-4", "bg-primary-container");
  });
});

describe("Input", () => {
  it("associa o label ao campo mesmo sem id explícito", () => {
    render(<Input label="Nome Completo" />);
    expect(screen.getByLabelText("Nome Completo")).toBeInTheDocument();
  });

  it("gera ids distintos para instâncias diferentes", () => {
    render(
      <>
        <Input label="Email" />
        <Input label="Senha" />
      </>,
    );
    const email = screen.getByLabelText("Email");
    const senha = screen.getByLabelText("Senha");
    expect(email.id).not.toBe(senha.id);
  });

  it("respeita um id informado pelo chamador", () => {
    render(<Input label="Email" id="campo-email" />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("id", "campo-email");
  });

  it("anuncia o erro e marca o campo como inválido", () => {
    render(<Input label="Email" error="E-mail inválido." />);
    const campo = screen.getByLabelText("Email");
    expect(campo).toHaveAttribute("aria-invalid", "true");
    expect(campo).toHaveAccessibleDescription("E-mail inválido.");
  });

  it("não marca aria-invalid quando não há erro", () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid");
  });

  it("aceita digitação", async () => {
    render(<Input label="Nome" />);
    const campo = screen.getByLabelText("Nome");
    await userEvent.type(campo, "Ana");
    expect(campo).toHaveValue("Ana");
  });
});

describe("Alert", () => {
  it('usa role="alert" no tom de erro, para leitores de tela interromperem', () => {
    render(<Alert tone="error">Falhou</Alert>);
    expect(screen.getByRole("alert")).toHaveTextContent("Falhou");
  });

  it('usa role="status" nos demais tons', () => {
    render(<Alert tone="success">Pronto</Alert>);
    expect(screen.getByRole("status")).toHaveTextContent("Pronto");
  });

  it.each(["error", "warning", "success", "info"] as const)(
    'o tom "%s" traz variante dark junto do fundo claro',
    (tone) => {
      const { container } = render(<Alert tone={tone}>Mensagem</Alert>);
      const classes = (container.firstChild as HTMLElement).className;
      expect(classes).toMatch(/\bbg-\w+-50\b/);
      expect(classes).toMatch(/\bdark:bg-\w+-500\/10\b/);
    },
  );
});

describe("Badge", () => {
  it.each(["success", "warning", "danger", "info"] as const)(
    'o tom "%s" traz variante dark junto do fundo claro',
    (tone) => {
      render(<Badge tone={tone}>Rótulo</Badge>);
      const classes = screen.getByText("Rótulo").className;
      expect(classes).toMatch(/\bbg-\w+-100\b/);
      expect(classes).toMatch(/\bdark:bg-\w+-500\/10\b/);
    },
  );

  it("usa tokens do design system nos tons neutro e de marca", () => {
    render(
      <>
        <Badge tone="neutral">Neutro</Badge>
        <Badge tone="brand">Marca</Badge>
      </>,
    );
    expect(screen.getByText("Neutro")).toHaveClass("bg-surface-container");
    expect(screen.getByText("Marca")).toHaveClass("bg-primary-fixed");
  });
});

describe("Card", () => {
  it("aplica superfície, borda e raio do design system", () => {
    const { container } = render(<Card>conteúdo</Card>);
    expect(container.firstChild).toHaveClass(
      "bg-surface-container-lowest",
      "border-outline-variant",
      "rounded-2xl",
    );
  });

  it("permite remover o padding interno", () => {
    const { container } = render(<Card padding="none">conteúdo</Card>);
    expect(container.firstChild).not.toHaveClass("p-6");
  });

  it("só adiciona realce de hover quando interativo", () => {
    const { container, rerender } = render(<Card>a</Card>);
    expect(container.firstChild).not.toHaveClass("hover:shadow-md");

    rerender(<Card interactive>a</Card>);
    expect(container.firstChild).toHaveClass("hover:shadow-md");
  });
});
