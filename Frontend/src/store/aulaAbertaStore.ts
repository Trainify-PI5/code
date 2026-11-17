import { create } from "zustand";

/**
 * A aula que está aberta na tela, para o balão do assistente saber do que se
 * trata. A tela da aula avisa quando abre ou troca de aula e limpa ao sair;
 * o balão só lê. Sem isso o balão respondia como se a pessoa estivesse fora do
 * curso, enquanto o botão "Assistente IA" do topo da aula já mandava a aula.
 *
 * Não é persistido: aula aberta é estado da tela, não da sessão.
 */
export interface AulaAberta {
  lessonId: string;
  courseId: string;
  titulo: string;
}

interface AulaAbertaState {
  aula: AulaAberta | null;
  abrir: (aula: AulaAberta) => void;
  /**
   * Só limpa se a aula informada ainda for a aberta. Evita que a saída de uma
   * aula apague a que acabou de ser aberta no lugar dela.
   */
  fechar: (lessonId: string) => void;
}

export const useAulaAbertaStore = create<AulaAbertaState>((set) => ({
  aula: null,
  abrir: (aula) => set({ aula }),
  fechar: (lessonId) =>
    set((estado) => (estado.aula?.lessonId === lessonId ? { aula: null } : estado)),
}));
