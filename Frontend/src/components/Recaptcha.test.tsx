import { createRef } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A site key é lida do config na importação; cada bloco controla o valor.
const mockConfig = vi.hoisted(() => ({ siteKey: "" }));
vi.mock("../config", () => ({
  get RECAPTCHA_SITE_KEY() {
    return mockConfig.siteKey;
  },
}));

import Recaptcha, { type RecaptchaHandle } from "./Recaptcha";

describe("Recaptcha — sem chave configurada", () => {
  beforeEach(() => {
    mockConfig.siteKey = "";
  });

  it("não renderiza nada, para o login seguir sem verificação", () => {
    const { container } = render(<Recaptcha onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("não carrega o script do Google", () => {
    render(<Recaptcha onChange={() => {}} />);
    expect(document.getElementById("recaptcha-explicit-script")).toBeNull();
  });
});

describe("Recaptcha — com chave configurada", () => {
  let callbackSalvo: ((token: string) => void) | undefined;
  let expiradoSalvo: (() => void) | undefined;
  const resetMock = vi.fn();
  const renderMock = vi.fn();

  beforeEach(() => {
    mockConfig.siteKey = "chave-de-site-ficticia";
    callbackSalvo = undefined;
    expiradoSalvo = undefined;
    resetMock.mockClear();
    renderMock.mockClear().mockImplementation((_el: HTMLElement, params: any) => {
      callbackSalvo = params.callback;
      expiradoSalvo = params["expired-callback"];
      return 7; // id do widget
    });
    // Simula o grecaptcha já disponível, sem baixar o script de verdade.
    (window as any).grecaptcha = { render: renderMock, reset: resetMock };
  });

  afterEach(() => {
    delete (window as any).grecaptcha;
  });

  it("monta o widget com a site key configurada", async () => {
    render(<Recaptcha onChange={() => {}} />);
    await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(1));
    expect(renderMock.mock.calls[0][1].sitekey).toBe("chave-de-site-ficticia");
  });

  it("entrega o token quando o desafio é resolvido", async () => {
    const onChange = vi.fn();
    render(<Recaptcha onChange={onChange} />);
    await waitFor(() => expect(renderMock).toHaveBeenCalled());

    callbackSalvo?.("token-123");
    expect(onChange).toHaveBeenCalledWith("token-123");
  });

  it("devolve null quando o desafio expira", async () => {
    const onChange = vi.fn();
    render(<Recaptcha onChange={onChange} />);
    await waitFor(() => expect(renderMock).toHaveBeenCalled());

    expiradoSalvo?.();
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("reset() limpa o widget e zera o token", async () => {
    const onChange = vi.fn();
    const ref = createRef<RecaptchaHandle>();
    render(<Recaptcha ref={ref} onChange={onChange} />);
    await waitFor(() => expect(renderMock).toHaveBeenCalled());

    ref.current?.reset();
    expect(resetMock).toHaveBeenCalledWith(7);
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
