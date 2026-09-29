import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

/**
 * Cabecalho de pagina. Antes cada tela escrevia o seu: eram 62 ocorrencias
 * espalhadas por 18 arquivos, com seis tamanhos de titulo diferentes e o
 * subtitulo ora colado, ora com mt-1, ora com mt-2.
 *
 * Aqui a hierarquia e decidida num lugar so, entao todas as telas passam a
 * abrir igual — que e o que faz um sistema parecer um sistema, e nao um
 * conjunto de paginas.
 */
export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Icone em destaque a esquerda do titulo. */
  icon?: ReactNode;
  /** Botoes da direita. No celular descem para baixo do titulo. */
  actions?: ReactNode;
  /** Linha de separacao embaixo; ligada por padrao. */
  divider?: boolean;
  className?: string;
}

export default function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  divider = true,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        divider && "border-b border-outline-variant pb-6",
        className,
      )}
    >
      <div className="flex items-start gap-4 min-w-0">
        {icon && (
          <div className="w-12 h-12 shrink-0 rounded-xl bg-primary-fixed text-primary flex items-center justify-center">
            {icon}
          </div>
        )}
        <div className="min-w-0 space-y-1">
          <h1 className="text-3xl font-display font-bold text-on-surface text-balance">
            {title}
          </h1>
          {subtitle && (
            <p className="text-on-surface-variant text-pretty">{subtitle}</p>
          )}
        </div>
      </div>

      {/* shrink-0 para os botoes nunca serem espremidos pelo titulo */}
      {actions && (
        <div className="flex flex-wrap items-center gap-3 shrink-0">{actions}</div>
      )}
    </div>
  );
}
