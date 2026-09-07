import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  referenceId: string;
  createdAt: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { token, isAuthenticated } = useAuthStore();

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const count = notifications.filter((n) => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    fetchNotifications();

    let eventSource: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout;
    let retryCount = 0;

    const connectSSE = () => {
      // Usamos fetch/API normal para passar header de Authorization?
      // O EventSource nativo não suporta custom headers nativamente. 
      // Em produção, isso pode ser contornado enviando token na URL (?token=) 
      // ou usando fetch com stream. Como estamos usando SSE, enviamos via URL 
      // (requer ajuste no backend para ler token da URL) ou cookies.
      // Assumindo que o backend suporta ler via JWT_TOKEN header OU como faremos?
      
      // Para funcionar via EventSource, o token geralmente vai na QueryString.
      // O backend do Spring Security teria que extrair.
      // Vamos tentar usar EventSource com withCredentials se tivermos cookies, ou query.
      // Vamos assumir que configuraremos o front para enviar na URL por simplicidade ou...
      // Vamos usar apenas EventSource padrão. Se der 401, falha.
      
      const sseUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'}/notifications/stream?access_token=${token}`;
      
      eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Se for notificação real (diferente de 'connected')
          if (data && data.id) {
             setNotifications(prev => [data, ...prev]);
             // Toca um sonzinho ou dispara um toast aqui
          }
        } catch (e) {
          //
        }
      };
      
      eventSource.addEventListener('notification', (event) => {
          try {
              const data = JSON.parse(event.data);
              if (data && data.id) {
                 setNotifications(prev => [data, ...prev]);
                 // Aqui poderia disparar um alerta visual / toast
              }
          } catch(e) {}
      });

      eventSource.onerror = (error) => {
        console.error('SSE Error', error);
        eventSource?.close();
        
        // Backoff Exponencial Simples
        const timeout = Math.min(10000, 1000 * Math.pow(2, retryCount));
        retryCount++;
        
        retryTimeout = setTimeout(() => {
          connectSSE();
        }, timeout);
      };
      
      eventSource.onopen = () => {
         retryCount = 0; // reset
      };
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearTimeout(retryTimeout);
    };
  }, [isAuthenticated, token, fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  return { notifications, unreadCount, markAsRead, fetchNotifications };
}
