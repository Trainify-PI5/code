import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

/**
 * Moldura de pagina: largura, respiro vertical e entrada.
 *
 * Antes cada tela escolhia no olho — a largura ia de max-w-3xl a max-w-7xl
 * sem criterio, o espacamento alternava entre space-y-4, 6 e 8, e tres paginas
 * repetiam um p-8 que o layout ja aplica, ficando com o dobro do recuo e o
 * conteudo desalinhado em relacao as vizinhas.
 *
 * O recuo nao mora aqui de proposito: quem o aplica e o <main>, uma vez so.
 */
type Largura = "narrow" | "default" | "wide" | "full";

// narrow: leitura e formulario, onde linha longa cansa
// default: listas e cartoes
// wide: tabela de muitas colunas e painel de graficos
const larguras: Record<Largura, string> = {
  narrow: "max-w-3xl",
  default: "max-w-5xl",
  wide: "max-w-7xl",
  full: "max-w-none",
};

export interface PageContainerProps {
  children: ReactNode;
  width?: Largura;
  className?: string;
}

export default function PageContainer({
  children,
  width = "default",
  className,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "w-full min-w-0 mx-auto space-y-8 animate-in fade-in duration-500",
        larguras[width],
        className,
      )}
    >
      {children}
    </div>
  );
}
