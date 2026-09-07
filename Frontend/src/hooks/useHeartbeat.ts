import { useEffect, useRef, useState } from 'react';
import api from '../services/api';

interface UseHeartbeatOptions {
  enrollmentId: string;
  lessonId: string;
  intervalMs?: number;
  enabled?: boolean;
}

export function useHeartbeat({
  enrollmentId,
  lessonId,
  intervalMs = 10000,
  enabled = true
}: UseHeartbeatOptions) {
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const isCompletedRef = useRef(isCompleted);

  useEffect(() => {
    isCompletedRef.current = isCompleted;
  }, [isCompleted]);

  useEffect(() => {
    if (!enabled || !enrollmentId || !lessonId) return;

    const interval = setInterval(async () => {
      try {
        await api.post(`/progress/enrollments/${enrollmentId}/lessons/${lessonId}/heartbeat`, {
          watchedSeconds,
          isCompleted: isCompletedRef.current
        });
      } catch (error) {
        console.error('Failed to send heartbeat', error);
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [enrollmentId, lessonId, intervalMs, enabled, watchedSeconds]);

  return {
    watchedSeconds,
    setWatchedSeconds,
    isCompleted,
    setIsCompleted
  };
}
