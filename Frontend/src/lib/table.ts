/**
 * Ordenacao e paginacao de tabela, no cliente. Nenhum endpoint da API aceita
 * page/size/sort hoje: as listas vem inteiras, entao o recorte e feito aqui.
 * Sao funcoes puras de proposito — a parte que erra silenciosamente e esta, e
 * assim ela pode ser testada sem montar tabela nenhuma.
 */
export type Direcao = "asc" | "desc";

export interface Ordenacao {
  key: string;
  direcao: Direcao;
}

/** Valor comparavel extraido de uma linha; null/undefined vao para o fim. */
export type ValorOrdenavel = string | number | Date | null | undefined;

function comparar(a: ValorOrdenavel, b: ValorOrdenavel): number {
  const aVazio = a === null || a === undefined || a === "";
  const bVazio = b === null || b === undefined || b === "";
  // vazio sempre no fim, independente da direcao: uma coluna em branco no topo
  // so atrapalha quem esta procurando alguma coisa
  if (aVazio && bVazio) return 0;
  if (aVazio) return 1;
  if (bVazio) return -1;

  if (a instanceof Date || b instanceof Date) {
    return new Date(a as Date).getTime() - new Date(b as Date).getTime();
  }
  if (typeof a === "number" && typeof b === "number") return a - b;

  // localeCompare com pt-BR para "Ética" cair depois de "Estratégia", e
  // numeric para "Modulo 10" vir depois de "Modulo 9"
  return String(a).localeCompare(String(b), "pt-BR", {
    numeric: true,
    sensitivity: "base",
  });
}

/**
 * Ordena sem mexer no array recebido. `extrair` devolve o valor da coluna;
 * quando ela nao e ordenavel, a lista volta como esta.
 *
 * O valor e calculado uma vez por linha, nao a cada comparacao: `extrair`
 * costuma formatar texto ou montar Date, e um sort faz O(n log n) comparacoes.
 */
export function ordenarLinhas<T>(
  linhas: T[],
  extrair: ((linha: T) => ValorOrdenavel) | undefined,
  direcao: Direcao,
): T[] {
  if (!extrair) return linhas;

  const sinal = direcao === "asc" ? 1 : -1;
  const comChave = linhas.map((linha) => ({ linha, chave: extrair(linha) }));

  comChave.sort((a, b) => {
    const aVazio = ehVazio(a.chave);
    const bVazio = ehVazio(b.chave);
    // vazio sempre no fim, nas duas direcoes: uma coluna em branco no topo so
    // atrapalha quem esta procurando alguma coisa
    if (aVazio || bVazio) {
      if (aVazio && bVazio) return 0;
      return aVazio ? 1 : -1;
    }
    return comparar(a.chave, b.chave) * sinal;
  });

  return comChave.map((item) => item.linha);
}

function ehVazio(v: ValorOrdenavel) {
  return v === null || v === undefined || v === "";
}

/** Quantas paginas cabem; sempre ao menos uma, para nao existir "pagina 0 de 0". */
export function totalDePaginas(total: number, porPagina: number) {
  if (porPagina <= 0) return 1;
  return Math.max(1, Math.ceil(total / porPagina));
}

/** Mantem a pagina dentro do intervalo valido depois de um filtro encolher a lista. */
export function paginaValida(pagina: number, total: number, porPagina: number) {
  return Math.min(Math.max(1, pagina), totalDePaginas(total, porPagina));
}

/** Fatia da pagina atual. porPagina 0 significa "sem paginacao". */
export function fatiarPagina<T>(linhas: T[], pagina: number, porPagina: number): T[] {
  if (porPagina <= 0) return linhas;
  const p = paginaValida(pagina, linhas.length, porPagina);
  const inicio = (p - 1) * porPagina;
  return linhas.slice(inicio, inicio + porPagina);
}

/** Texto do rodape: "Mostrando 1–20 de 137". Conta a partir de 1, para humanos. */
export function intervaloVisivel(total: number, pagina: number, porPagina: number) {
  if (total === 0) return { de: 0, ate: 0, total };
  if (porPagina <= 0) return { de: 1, ate: total, total };
  const p = paginaValida(pagina, total, porPagina);
  const de = (p - 1) * porPagina + 1;
  return { de, ate: Math.min(p * porPagina, total), total };
}

/**
 * Sequencia de paginas a mostrar, com reticencias quando ha muitas.
 * O null representa o corte: [1, null, 7, 8, 9, null, 42].
 */
export function janelaDePaginas(
  paginaAtual: number,
  paginas: number,
  vizinhas = 1,
): (number | null)[] {
  if (paginas <= 1) return [1];

  const fixas = new Set<number>([1, paginas]);
  for (let i = paginaAtual - vizinhas; i <= paginaAtual + vizinhas; i++) {
    if (i >= 1 && i <= paginas) fixas.add(i);
  }

  const ordenadas = [...fixas].sort((a, b) => a - b);
  const saida: (number | null)[] = [];
  let anterior = 0;
  for (const p of ordenadas) {
    // so vira reticencia quando pula mais de uma pagina; pular exatamente uma
    // ficaria "1 … 3", ocupando o mesmo espaco que "1 2 3"
    if (anterior && p - anterior > 1) saida.push(p - anterior === 2 ? anterior + 1 : null);
    saida.push(p);
    anterior = p;
  }
  return saida;
}

/** Proximo estado ao clicar no cabecalho: asc → desc → asc. */
export function alternarOrdenacao(atual: Ordenacao | null, key: string): Ordenacao {
  if (atual?.key === key) {
    return { key, direcao: atual.direcao === "asc" ? "desc" : "asc" };
  }
  return { key, direcao: "asc" };
}
