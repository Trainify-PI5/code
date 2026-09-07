import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Info, FileVideo, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNotifications, NotificationDto } from '../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const NotificationsPopover: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  
  const { notifications, unreadCount, markAsRead } = useNotifications();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    if (type.includes('COMPLETED')) return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    if (type.includes('FAILED')) return <AlertCircle className="w-5 h-5 text-red-500" />;
    return <Info className="w-5 h-5 text-blue-500" />;
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 relative rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">Notificações</h3>
            {unreadCount > 0 && (
              <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">
                {unreadCount} novas
              </span>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
                <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                <p className="text-sm">Nenhuma notificação por aqui.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`p-4 flex gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                      !notif.read ? 'bg-primary/5 dark:bg-primary/10' : ''
                    }`}
                    onClick={() => {
                      if (!notif.read) markAsRead(notif.id);
                    }}
                  >
                    <div className="shrink-0 mt-0.5">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${!notif.read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                        {notif.title}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-xs text-slate-400 mt-2 font-medium">
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    {!notif.read && (
                      <div className="shrink-0 flex flex-col items-end gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full mt-1.5" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
