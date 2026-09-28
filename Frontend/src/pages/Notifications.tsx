import { useState, useEffect } from "react";
import {
  Clock,
  BadgeCheck,
  FileText,
  MessageSquare,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";
import { ConfirmDialog, useToast } from "../components/ui";

export default function Notifications() {
  const { t } = useLanguage();

  const toast = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [marcando, setMarcando] = useState(false);
  const [limparAberto, setLimparAberto] = useState(false);

  const limparTodas = async () => {
    try {
      const { data } = await api.delete("/notifications");
      setNotifications([]);
      const removidas = data?.removed ?? 0;
      toast.success(
        removidas === 1 ? "1 notificação removida." : `${removidas} notificações removidas.`,
      );
    } catch (err) {
      console.error("Erro ao limpar notificações", err);
      toast.error("Não foi possível limpar as notificações.");
    }
  };

  // O backend so expoe PATCH /notifications/{id}/read — nao ha rota para
  // marcar todas de uma vez, entao isso percorre as nao lidas.
  const marcarTodasComoLidas = async () => {
    const naoLidas = notifications.filter((n) => !n.read);
    if (naoLidas.length === 0) {
      toast.info("Nenhuma notificação não lida.");
      return;
    }

    setMarcando(true);
    try {
      await Promise.all(naoLidas.map((n) => api.patch(`/notifications/${n.id}/read`)));
      setNotifications((atuais) => atuais.map((n) => ({ ...n, read: true })));
      toast.success(
        naoLidas.length === 1
          ? "Notificação marcada como lida."
          : `${naoLidas.length} notificações marcadas como lidas.`,
      );
    } catch (err) {
      console.error("Erro ao marcar notificações", err);
      toast.error("Não foi possível marcar as notificações.");
    } finally {
      setMarcando(false);
    }
  };

  useEffect(() => {
    import("../services/api").then(api => {
      api.default.get('/notifications').then(res => {
        const mapped = res.data.map((n: any) => ({
          id: n.id,
          title: n.title,
          desc: n.message,
          time: new Date(n.createdAt).toLocaleDateString(),
          type: n.type || "info",
          icon: FileText,
          read: n.isRead || n.read,
        }));
        setNotifications(mapped);
      }).catch(console.error);
    });
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end border-b border-outline-variant pb-6">
        <div className="min-w-0">
          <h1 className="text-3xl font-display font-bold text-on-surface">
            {t("notif.title")}
          </h1>
          <p className="text-on-surface-variant">{t("notif.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={marcarTodasComoLidas}
            disabled={marcando}
            className="flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary transition-all px-3 py-2 rounded-lg hover:bg-surface-container uppercase tracking-widest disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-4 h-4" /> {t("notif.markAllRead")}
          </button>
          <button
            onClick={() => {
              if (notifications.length === 0) {
                toast.info("Não há notificações para remover.");
                return;
              }
              setLimparAberto(true);
            }}
            className="flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-red-500 transition-all px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 uppercase tracking-widest"
          >
            <Trash2 className="w-4 h-4" /> {t("notif.clearAll")}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={cn(
              "bg-surface-container-lowest border rounded-2xl p-6 flex gap-5 transition-all duration-200 hover:shadow-md group cursor-pointer",
              notif.read
                ? "border-outline-variant opacity-80"
                : "border-primary shadow-sm",
            )}
          >
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center shrink-0 border",
                notif.type === "success"
                  ? "bg-green-50 border-green-100 text-green-600 dark:bg-green-500/10 dark:border-green-500/30 dark:text-green-400"
                  : notif.type === "info"
                    ? "bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400"
                    : "bg-primary-fixed border-outline-variant text-primary",
              )}
            >
              <notif.icon className="w-6 h-6" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex justify-between items-start">
                <h4 className="font-display font-bold text-on-surface group-hover:text-primary transition-colors">
                  {notif.title}
                </h4>
                <div className="flex items-center gap-2">
                  {!notif.read && (
                    <div className="w-2 h-2 bg-primary-container rounded-full" />
                  )}
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {notif.time}
                  </span>
                </div>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {notif.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={limparAberto}
        onClose={() => setLimparAberto(false)}
        onConfirm={limparTodas}
        tone="danger"
        title="Limpar notificações"
        message={
          notifications.length === 1
            ? "A notificação será removida definitivamente."
            : `As ${notifications.length} notificações serão removidas definitivamente.`
        }
        confirmLabel="Limpar tudo"
      />
    </div>
  );
}
