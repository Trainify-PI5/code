/**
 * Filtros da tela de Dashboards. A API de analytics nao aceita parametros de
 * filtro: os endpoints devolvem tudo do tenant. Entao o recorte e feito aqui,
 * sobre o que ja veio, e as mesmas regras valem para a tabela e para o
 * relatorio exportado — assim o arquivo bate com o que esta na tela.
 */
export interface FiltrosAnalytics {
  /** Id do curso; "" significa todos. */
  courseId: string;
  /** EnrollmentStatus do backend; "" significa todas as situacoes. */
  status: string;
  /** Trecho do nome ou do e-mail do aluno. */
  busca: string;
}

export const FILTROS_VAZIOS: FiltrosAnalytics = { courseId: "", status: "", busca: "" };

/** Uma matricula, no minimo que os filtros precisam enxergar. */
export interface LinhaFiltravel {
  courseId?: string | null;
  status?: string | null;
  studentName?: string | null;
  studentEmail?: string | null;
}

export function contarFiltrosAtivos(filtros: FiltrosAnalytics) {
  return [filtros.courseId, filtros.status, filtros.busca.trim()].filter(Boolean).length;
}

export function temFiltroAtivo(filtros: FiltrosAnalytics) {
  return contarFiltrosAtivos(filtros) > 0;
}

/** Ignora acento e caixa, para "Joao" achar "João". */
function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function combina(linha: LinhaFiltravel, filtros: FiltrosAnalytics) {
  if (filtros.courseId && linha.courseId !== filtros.courseId) return false;
  if (filtros.status && linha.status !== filtros.status) return false;

  const busca = normalizar(filtros.busca.trim());
  if (!busca) return true;

  const alvo = normalizar(`${linha.studentName ?? ""} ${linha.studentEmail ?? ""}`);
  return alvo.includes(busca);
}

export function aplicarFiltros<T extends LinhaFiltravel>(linhas: T[], filtros: FiltrosAnalytics) {
  return linhas.filter((linha) => combina(linha, filtros));
}

/** Lista de cursos para o seletor, sem repetir e em ordem alfabetica. */
export function cursosDisponiveis(linhas: { courseId?: string | null; courseTitle?: string | null }[]) {
  const porId = new Map<string, string>();
  for (const linha of linhas) {
    if (linha.courseId) porId.set(linha.courseId, linha.courseTitle || linha.courseId);
  }
  return [...porId.entries()]
    .map(([id, titulo]) => ({ id, titulo }))
    .sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
}
