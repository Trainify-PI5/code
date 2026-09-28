import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog, Modal, ToastProvider, useToast } from "./index";

describe("Modal", () => {
  it("não renderiza nada quando fechado", () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}} title="Editar">
        conteúdo
      </Modal>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("expõe um dialog acessível com o título como rótulo", () => {
    render(
      <Modal open onClose={() => {}} title="Editar usuário">
        conteúdo
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("Editar usuário");
  });

  it("fecha ao clicar no X", async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Editar">
        conteúdo
      </Modal>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("fecha ao pressionar Escape", async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Editar">
        conteúdo
      </Modal>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("não fecha ao clicar dentro do painel", async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Editar">
        <p>conteúdo interno</p>
      </Modal>,
    );
    await userEvent.click(screen.getByText("conteúdo interno"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("esconde o X quando hideCloseButton", () => {
    render(
      <Modal open onClose={() => {}} title="Confirme" hideCloseButton>
        conteúdo
      </Modal>,
    );
    expect(screen.queryByRole("button", { name: "Fechar" })).not.toBeInTheDocument();
  });

  it("trava a rolagem da página enquanto está aberto", () => {
    const { unmount } = render(
      <Modal open onClose={() => {}} title="Editar">
        conteúdo
      </Modal>,
    );
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});

describe("ConfirmDialog", () => {
  it("confirma e fecha", async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        open
        onClose={onClose}
        onConfirm={onConfirm}
        title="Excluir usuário"
        confirmLabel="Excluir"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("tem nome acessível mesmo sem cabeçalho visível", () => {
    render(
      <ConfirmDialog open onClose={() => {}} onConfirm={() => {}} title="Excluir usuário" />,
    );
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Excluir usuário");
  });

  it("cancela sem confirmar", async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmDialog open onClose={onClose} onConfirm={onConfirm} title="Excluir" />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("espera a confirmação assíncrona antes de fechar", async () => {
    let liberar: () => void = () => {};
    const onConfirm = vi.fn(
      () => new Promise<void>((resolve) => {
        liberar = resolve;
      }),
    );
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        open
        onClose={onClose}
        onConfirm={onConfirm}
        title="Excluir"
        confirmLabel="Excluir"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    // enquanto a promessa não resolve, o dialogo segue aberto e travado
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Aguarde..." })).toBeDisabled();

    liberar();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});

function Disparador() {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.success("Usuário criado.")}>ok</button>
      <button onClick={() => toast.error("Falhou.")}>erro</button>
    </>
  );
}

describe("Toast", () => {
  it("mostra o aviso disparado", async () => {
    render(
      <ToastProvider>
        <Disparador />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "ok" }));
    expect(screen.getByText("Usuário criado.")).toBeInTheDocument();
  });

  it('usa role="alert" no erro, para leitores de tela interromperem', async () => {
    render(
      <ToastProvider>
        <Disparador />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "erro" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Falhou.");
  });

  it("empilha vários avisos", async () => {
    render(
      <ToastProvider>
        <Disparador />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "ok" }));
    await userEvent.click(screen.getByRole("button", { name: "erro" }));
    expect(screen.getByText("Usuário criado.")).toBeInTheDocument();
    expect(screen.getByText("Falhou.")).toBeInTheDocument();
  });

  it("fecha o aviso no botão de dispensar", async () => {
    render(
      <ToastProvider>
        <Disparador />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "ok" }));
    await userEvent.click(screen.getByRole("button", { name: "Fechar aviso" }));
    expect(screen.queryByText("Usuário criado.")).not.toBeInTheDocument();
  });

  it("some sozinho depois do tempo", () => {
    // userEvent e waitFor dependem de timer real, entao aqui o clique e o
    // avanço do relogio sao feitos de forma sincrona.
    vi.useFakeTimers();
    try {
      render(
        <ToastProvider>
          <Disparador />
        </ToastProvider>,
      );

      fireEvent.click(screen.getByRole("button", { name: "ok" }));
      expect(screen.getByText("Usuário criado.")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(screen.queryByText("Usuário criado.")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("useToast falha fora do ToastProvider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Disparador />)).toThrow(
      "useToast precisa estar dentro de um ToastProvider",
    );
    consoleError.mockRestore();
  });
});
