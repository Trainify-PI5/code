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

export default function Notifications() {
  const { t } = useLanguage();

  const [notifications, setNotifications] = useState<any[]>([]);

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
      <div className="flex justify-between items-end border-b border-outline-variant pb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-on-surface">
            {t("notif.title")}
          </h1>
          <p className="text-on-surface-variant">{t("notif.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary transition-all px-3 py-2 rounded-lg hover:bg-surface-container uppercase tracking-widest">
            <CheckCircle className="w-4 h-4" /> {t("notif.markAllRead")}
          </button>
          <button className="flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-red-500 transition-all px-3 py-2 rounded-lg hover:bg-red-50 uppercase tracking-widest">
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
                  ? "bg-green-50 border-green-100 text-green-600"
                  : notif.type === "info"
                    ? "bg-blue-50 border-blue-100 text-blue-600"
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
    </div>
  );
}
