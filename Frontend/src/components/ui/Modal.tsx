import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

type Tamanho = "sm" | "md" | "lg";

const tamanhos: Record<Tamanho, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: Tamanho;
  /** Rodape — normalmente os botoes de acao. */
  footer?: ReactNode;
  children?: ReactNode;
  /** Esconde o X do cabecalho (ex.: confirmacao que exige escolha explicita). */
  hideCloseButton?: boolean;
  /** Nome acessivel quando o titulo visual nao fica no cabecalho do Modal. */
  ariaLabel?: string;
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  footer,
  children,
  hideCloseButton = false,
  ariaLabel,
}: ModalProps) {
  const painel = useRef<HTMLDivElement>(null);

  // Esc fecha, e a pagina atras nao rola enquanto o modal esta aberto.
  useEffect(() => {
    if (!open) return;

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", aoTeclar);

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Foco vai para o painel: sem isso o leitor de tela continua no botao
    // que abriu o modal e o Tab passeia pelo conteudo de tras.
    painel.current?.focus();

    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAnterior;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl",
          "outline-none overflow-hidden animate-in zoom-in-95 duration-200",
          tamanhos[size],
        )}
      >
        {(title || !hideCloseButton) && (
          <div className="flex items-start justify-between gap-4 p-6 border-b border-outline-variant">
            <div className="min-w-0">
              {title && (
                <h2 className="text-xl font-display font-bold text-on-surface">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-sm text-on-surface-variant mt-1">
                  {description}
                </p>
              )}
            </div>
            {!hideCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="shrink-0 p-1.5 -m-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {children && <div className="p-6">{children}</div>}

        {footer && (
          <div className="flex flex-wrap justify-end gap-3 p-6 pt-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
