import api from '../services/api';

/** Aula usada pelo assistente para montar a resposta. */
export interface FonteIa {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
}

export interface RespostaIa {
  response: string;
  sources: FonteIa[];
}

export interface MensagemHistorico {
  role: 'user' | 'assistant';
  content: string;
}

/** O assistente usa as ultimas mensagens para entender perguntas de seguimento. */
export const LIMITE_HISTORICO = 10;

/**
 * Converte as mensagens da tela no historico enviado ao backend: so perguntas e
 * respostas de verdade, sem a saudacao inicial nem avisos de erro.
 */
export function montarHistorico(
  mensagens: { role: string; text: string; historico?: boolean }[],
): MensagemHistorico[] {
  return mensagens
    .filter((m) => m.historico !== false && m.text.trim())
    .map((m): MensagemHistorico => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text,
    }))
    .slice(-LIMITE_HISTORICO);
}

export async function perguntarAssistente(
  pergunta: string,
  historico: MensagemHistorico[] = [],
  contexto: { lessonId?: string | null; courseId?: string | null } = {},
): Promise<RespostaIa> {
  const { data } = await api.post('/ia/chat', {
    query: pergunta,
    history: historico,
    ...(contexto.lessonId ? { lessonId: contexto.lessonId } : {}),
    ...(contexto.courseId ? { courseId: contexto.courseId } : {}),
  });
  return { response: data?.response ?? '', sources: Array.isArray(data?.sources) ? data.sources : [] };
}
