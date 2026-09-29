import type { ReactNode } from "react";

/**
 * Busca da paleta de comandos.
 *
 * E casamento por prefixo e trecho, nao busca difusa. Difusa acha coisa demais:
 * digitar "cur" traria "Configurações da Empresa" por causa do c-u-r espalhado,
 * e a primeira opcao da lista e a que o Enter executa. Aqui o que aparece no
 * topo e sempre explicavel.
 */
export type GrupoComando = "navegacao" | "curso" | "usuario" | "acao";

export interface Comando {
  id: string;
  titulo: string;
  /** Linha de apoio: e-mail do usuario, descricao do curso. Tambem entra na busca. */
  descricao?: string;
  grupo: GrupoComando;
  icone?: ReactNode;
  executar: () => void;
  /** Palavras que tambem encontram o item, sem aparecer na tela. */
  sinonimos?: string[];
}

/** Tira acento e caixa, para "analise" encontrar "Análises". */
export function normalizar(texto: string) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

const PONTOS = {
  tituloComeca: 100,
  palavraComeca: 70,
  tituloContem: 50,
  sinonimo: 40,
  descricaoContem: 20,
} as const;

/**
 * Quao bem o comando responde ao termo. null quer dizer "nao serve".
 * Sem termo todos servem, com pontuacao zero — a ordem fica por conta do grupo.
 */
export function pontuar(comando: Comando, termo: string): number | null {
  const busca = normalizar(termo);
  if (!busca) return 0;

  const titulo = normalizar(comando.titulo);

  if (titulo.startsWith(busca)) return PONTOS.tituloComeca + bonusDeTamanho(titulo);
  if (titulo.split(/[\s\-/]+/).some((palavra) => palavra.startsWith(busca))) {
    return PONTOS.palavraComeca + bonusDeTamanho(titulo);
  }
  if (titulo.includes(busca)) return PONTOS.tituloContem + bonusDeTamanho(titulo);

  if (comando.sinonimos?.some((s) => normalizar(s).includes(busca))) return PONTOS.sinonimo;

  if (comando.descricao && normalizar(comando.descricao).includes(busca)) {
    return PONTOS.descricaoContem;
  }

  return null;
}

// desempate: entre dois titulos que comecam igual, o mais curto e o mais
// provavel — "Cursos" antes de "Cursos concluidos" para quem digitou "cur"
function bonusDeTamanho(titulo: string) {
  return Math.max(0, 20 - titulo.length) / 100;
}

/** Ordem dos grupos na lista, de cima para baixo. */
export const ORDEM_DOS_GRUPOS: GrupoComando[] = ["navegacao", "curso", "usuario", "acao"];

export const ROTULO_DO_GRUPO: Record<GrupoComando, string> = {
  navegacao: "Ir para",
  curso: "Cursos",
  usuario: "Usuários",
  acao: "Ações",
};

export interface Secao {
  grupo: GrupoComando;
  rotulo: string;
  comandos: Comando[];
}

/**
 * Quantos itens cada grupo mostra. Cursos e usuarios vem da API e podem ser
 * centenas: sem teto empurrariam a navegacao para fora da tela. A navegacao e
 * uma lista fechada e curta, entao cabe inteira: qualquer teto aqui esconde um
 * item do menu conforme o perfil ganha telas. Com 12, "Criar Curso" — o 13o
 * para um admin — desaparecia da paleta.
 */
export const LIMITE_PADRAO: Record<GrupoComando, number> = {
  navegacao: Infinity,
  curso: 5,
  usuario: 5,
  acao: 5,
};

/** Filtra, ordena e agrupa. */
export function montarSecoes(
  comandos: Comando[],
  termo: string,
  limites: Partial<Record<GrupoComando, number>> = {},
): Secao[] {
  const teto = { ...LIMITE_PADRAO, ...limites };
  const buscando = normalizar(termo).length > 0;

  const pontuados = comandos
    .map((comando) => ({ comando, pontos: pontuar(comando, termo) }))
    .filter((item): item is { comando: Comando; pontos: number } => item.pontos !== null);

  return ORDEM_DOS_GRUPOS.map((grupo) => {
    const doGrupo = pontuados.filter((item) => item.comando.grupo === grupo);

    // Sem termo, todas as pontuacoes sao zero: mantem a ordem em que os
    // comandos foram declarados, que espelha o menu lateral. Ordenar por
    // alfabeto ai so embaralharia um menu que a pessoa ja conhece de cor.
    if (buscando) {
      doGrupo.sort(
        (a, b) =>
          b.pontos - a.pontos ||
          a.comando.titulo.localeCompare(b.comando.titulo, "pt-BR"),
      );
    }

    return {
      grupo,
      rotulo: ROTULO_DO_GRUPO[grupo],
      comandos: doGrupo.slice(0, teto[grupo]).map((item) => item.comando),
    };
  }).filter((secao) => secao.comandos.length > 0);
}

/** Lista achatada na ordem em que aparece — e por ela que as setas andam. */
export function achatar(secoes: Secao[]): Comando[] {
  return secoes.flatMap((secao) => secao.comandos);
}

/**
 * Proximo indice ao apertar seta. Da a volta nas duas pontas: quem esta no
 * ultimo item e aperta para baixo espera voltar ao primeiro, nao travar.
 */
export function proximoIndice(atual: number, total: number, passo: 1 | -1) {
  if (total === 0) return 0;
  return (atual + passo + total) % total;
}
