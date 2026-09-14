import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';

interface UseHeartbeatOptions {
  enrollmentId: string;
  lessonId: string;
  intervalMs?: number;
  enabled?: boolean;
}

interface HeartbeatPayload {
  watchedSeconds: number;
  isCompleted: boolean;
}

export function useHeartbeat({
  enrollmentId,
  lessonId,
  intervalMs = 10000,
  enabled = true
}: UseHeartbeatOptions) {
  const [watchedSeconds, setWatchedSecondsState] = useState(0);
  const [isCompleted, setIsCompletedState] = useState(false);

  // Os valores ficam em refs para o intervalo ler sempre o mais recente sem ser
  // recriado. Com o state nas dependencias, o timer de 10s reiniciava a cada
  // segundo de video e nenhum heartbeat era enviado durante a reproducao.
  const watchedSecondsRef = useRef(0);
  const isCompletedRef = useRef(false);
  const lastSentRef = useRef<HeartbeatPayload | null>(null);
  const flushRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (!enabled || !enrollmentId || !lessonId) return;

    // Cada aula comeca do zero: sem isso a aula seguinte herdava o isCompleted
    // e os segundos da anterior e era marcada como concluida sem ser assistida.
    watchedSecondsRef.current = 0;
    isCompletedRef.current = false;
    lastSentRef.current = null;
    setWatchedSecondsState(0);
    setIsCompletedState(false);

    const flush = (): Promise<void> => {
      const payload: HeartbeatPayload = {
        watchedSeconds: watchedSecondsRef.current,
        isCompleted: isCompletedRef.current
      };
      const last = lastSentRef.current;

      const nothingWatched = !last && payload.watchedSeconds === 0 && !payload.isCompleted;
      const unchanged = !!last
        && last.watchedSeconds === payload.watchedSeconds
        && last.isCompleted === payload.isCompleted;
      if (nothingWatched || unchanged) return Promise.resolve();

      lastSentRef.current = payload;
      return api.post(`/progress/enrollments/${enrollmentId}/lessons/${lessonId}/heartbeat`, payload)
        .then(() => undefined)
        .catch((error) => {
          // Libera o reenvio do mesmo payload no proximo ciclo
          if (lastSentRef.current === payload) {
            lastSentRef.current = last;
          }
          console.error('Failed to send heartbeat', error);
        });
    };

    flushRef.current = flush;
    const interval = setInterval(flush, intervalMs);

    // Ao trocar de aula ou sair do player, envia o que ainda estava pendente
    // para a aula que esta sendo deixada.
    return () => {
      clearInterval(interval);
      flushRef.current = null;
      flush();
    };
  }, [enrollmentId, lessonId, intervalMs, enabled]);

  const setWatchedSeconds = useCallback((seconds: number) => {
    watchedSecondsRef.current = seconds;
    setWatchedSecondsState(seconds);
  }, []);

  const setIsCompleted = useCallback((completed: boolean): Promise<void> => {
    isCompletedRef.current = completed;
    setIsCompletedState(completed);
    // A conclusao vai na hora: esperar o proximo intervalo perdia o evento
    // quando o aluno trocava de aula antes dos 10s. A Promise deixa quem chama
    // atualizar a tela so depois que o backend registrou.
    if (completed && flushRef.current) {
      return flushRef.current();
    }
    return Promise.resolve();
  }, []);

  return {
    watchedSeconds,
    setWatchedSeconds,
    isCompleted,
    setIsCompleted
  };
}
