import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { RECAPTCHA_SITE_KEY } from "../config";
import { useThemeStore } from "../store/themeStore";

/**
 * Checkbox "não sou um robô" (reCAPTCHA v2).
 *
 * Só aparece quando há uma site key configurada (VITE_RECAPTCHA_SITE_KEY); sem
 * ela o componente não renderiza nada, e o login segue sem a verificação — o
 * par disso no backend é app.recaptcha.enabled=false.
 *
 * Usa renderização explícita (api.js?render=explicit) para controlar quando o
 * widget monta e para conseguir resetá-lo depois de um login recusado.
 */
export interface RecaptchaHandle {
  /** Limpa o desafio resolvido; o usuário precisa marcar de novo. */
  reset: () => void;
}

interface RecaptchaProps {
  /** Recebe o token quando resolvido, ou null quando expira/é limpo. */
  onChange: (token: string | null) => void;
}

interface Grecaptcha {
  render: (
    container: HTMLElement,
    params: {
      sitekey: string;
      theme?: "light" | "dark";
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ) => number;
  reset: (widgetId?: number) => void;
}

declare global {
  interface Window {
    grecaptcha?: Grecaptcha & { ready?: (cb: () => void) => void };
    onRecaptchaLoad?: () => void;
  }
}

const SCRIPT_ID = "recaptcha-explicit-script";

/**
 * Espera grecaptcha.render virar uma função de verdade. No onload do api.js o
 * objeto grecaptcha já existe, mas o método render é anexado um instante depois;
 * sem esta espera o widget às vezes nunca monta.
 */
function aguardarRender(): Promise<void> {
  return new Promise((resolve, reject) => {
    const inicio = Date.now();
    const checar = () => {
      if (typeof window.grecaptcha?.render === "function") {
        resolve();
      } else if (Date.now() - inicio > 10000) {
        reject(new Error("reCAPTCHA não ficou pronto a tempo"));
      } else {
        setTimeout(checar, 100);
      }
    };
    checar();
  });
}

/** Carrega o api.js uma única vez e resolve quando grecaptcha.render existe. */
function carregarScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.grecaptcha?.render) {
      resolve();
      return;
    }

    const existente = document.getElementById(SCRIPT_ID);
    if (existente) {
      existente.addEventListener("load", () => aguardarRender().then(resolve, reject));
      existente.addEventListener("error", () => reject(new Error("falha ao carregar o reCAPTCHA")));
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => aguardarRender().then(resolve, reject);
    script.onerror = () => reject(new Error("falha ao carregar o reCAPTCHA"));
    document.head.appendChild(script);
  });
}

const Recaptcha = forwardRef<RecaptchaHandle, RecaptchaProps>(({ onChange }, ref) => {
  const { isDarkMode } = useThemeStore();
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<number | null>(null);
  const [erro, setErro] = useState(false);

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetId.current !== null && window.grecaptcha) {
        window.grecaptcha.reset(widgetId.current);
        onChange(null);
      }
    },
  }));

  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY) return;

    let cancelado = false;

    carregarScript()
      .then(() => {
        // Guardas: StrictMode monta duas vezes; evita render duplicado.
        if (cancelado || !container.current || widgetId.current !== null) return;
        if (!window.grecaptcha?.render) return;

        widgetId.current = window.grecaptcha.render(container.current, {
          sitekey: RECAPTCHA_SITE_KEY,
          theme: isDarkMode ? "dark" : "light",
          callback: (token: string) => onChange(token),
          "expired-callback": () => onChange(null),
          "error-callback": () => onChange(null),
        });
      })
      .catch(() => {
        if (!cancelado) setErro(true);
      });

    return () => {
      cancelado = true;
    };
    // O tema entra na montagem; o reCAPTCHA v2 não troca de tema depois de
    // renderizado, então não recriamos o widget só por causa disso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChange]);

  if (!RECAPTCHA_SITE_KEY) return null;

  if (erro) {
    return (
      <p className="text-xs text-red-500">
        Não foi possível carregar a verificação anti-robô. Recarregue a página.
      </p>
    );
  }

  return <div ref={container} className="flex justify-center" />;
});

Recaptcha.displayName = "Recaptcha";

export default Recaptcha;
