import { useThemeStore } from "../store/themeStore";

/**
 * Cores dos graficos. O Recharts pinta por atributo SVG, entao nao enxerga as
 * classes do Tailwind nem as variaveis do tema: os valores precisam chegar
 * prontos. Sem isso o tema escuro herdava as cores do claro — os rotulos dos
 * eixos ficavam em 2.13:1 e a grade, pensada para ser discreta, virava linha
 * branca em 17:1.
 */
export interface TemaGrafico {
  /** Linhas de grade: discretas de proposito, perto de 1.2:1 contra o cartao. */
  grade: string;
  /** Rotulos dos eixos: texto pequeno, precisa dos 4.5:1. */
  eixo: string;
  /** Series do grafico de engajamento. */
  matriculas: string;
  conclusoes: string;
  /** Uma cor por situacao de matricula, fixa para a pizza e a legenda baterem. */
  status: Record<string, string>;
  /** Fatia de situacao desconhecida. */
  neutro: string;
  /** Vai direto no contentStyle do Tooltip do Recharts. */
  tooltip: {
    backgroundColor: string;
    borderColor: string;
    color: string;
  };
}

export const TEMA_CLARO: TemaGrafico = {
  grade: "#edeeef",
  eixo: "#494552",
  matriculas: "#4b2c92",
  conclusoes: "#16a34a",
  status: {
    IN_PROGRESS: "#4b2c92",
    COMPLETED: "#16a34a",
    CANCELLED: "#b3aac0",
  },
  neutro: "#edeeef",
  tooltip: {
    backgroundColor: "#ffffff",
    borderColor: "#cbc4d3",
    color: "#191c1d",
  },
};

export const TEMA_ESCURO: TemaGrafico = {
  grade: "#262626",
  eixo: "#cac4d0",
  matriculas: "#d1bcff",
  conclusoes: "#4ade80",
  status: {
    IN_PROGRESS: "#d1bcff",
    COMPLETED: "#4ade80",
    // cinza apagado de proposito, como no claro: cancelada nao disputa atencao
    CANCELLED: "#6b6673",
  },
  neutro: "#262626",
  tooltip: {
    backgroundColor: "#1e1e1e",
    borderColor: "#49454f",
    color: "#e6e0e9",
  },
};

export function temaGrafico(escuro: boolean): TemaGrafico {
  return escuro ? TEMA_ESCURO : TEMA_CLARO;
}

/** Acompanha a troca de tema: o grafico se repinta junto com o resto da tela. */
export function useTemaGrafico(): TemaGrafico {
  return temaGrafico(useThemeStore((estado) => estado.isDarkMode));
}
