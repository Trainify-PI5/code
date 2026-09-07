import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  Bot,
  Settings,
  HelpCircle,
  Play,
  Award,
  Users as UsersIcon,
  PlusCircle,
  Activity,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuthStore } from "../store/authStore";
import logomarca from "../assets/images/logomarca.svg";
import logotipoLight from "../assets/images/logotipo-modo_light.svg";
import logotipoDark from "../assets/images/logotipo-modo_dark.svg";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isCollapsed: boolean;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  isCollapsed,
}: SidebarProps) {
  const { t } = useLanguage();
  const { user } = useAuthStore();

  const navItems = [
    { id: "home", label: t("nav.home"), icon: LayoutDashboard },
    { id: "courses", label: t("nav.courses"), icon: BookOpen },
    // FIX 1: Dashboards visível apenas para ADMIN e MANAGER
    ...(user?.role === "ADMIN" || user?.role === "SUPER_ADMIN" || user?.role === "MANAGER"
      ? [{ id: "dashboards", label: t("nav.analytics"), icon: BarChart3 }]
      : []),
    { id: "certifications", label: t("nav.certifications"), icon: Award },
    { id: "assistant", label: t("nav.assistant") || "IA Assistant", icon: Bot },
  ];

  if (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN" || user?.role === "MANAGER") {
    navItems.push({ id: "users", label: "Usuários", icon: UsersIcon });
  }

  if (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") {
    navItems.push({ id: "tenant-settings", label: "Empresa", icon: Settings });
    navItems.push({ id: "audit-logs", label: "Auditoria", icon: Activity });
  }

  if (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN" || user?.role === "INSTRUCTOR") {
    navItems.push({
      id: "courses/builder",
      label: "Criar Curso",
      icon: PlusCircle,
    });
  }

  return (
    <nav
      className={cn(
        "fixed left-0 top-0 h-screen border-r border-outline-variant bg-surface-container-lowest z-40 flex flex-col font-display antialiased tracking-tight transition-all duration-300",
        // No desktop (lg), a sidebar muda de tamanho.
        // No mobile, se "isCollapsed" é true (fechada), esconde usando off-canvas (-translate-x-full).
        // Se false, mostra.
        isCollapsed
          ? "-translate-x-full lg:translate-x-0 lg:w-[80px]"
          : "translate-x-0 w-[260px]",
        !isCollapsed && "shadow-2xl lg:shadow-none"
      )}
    >
      <div
        className={cn(
          "h-16 border-b border-outline-variant flex items-center",
          isCollapsed ? "justify-center px-0" : "px-6",
        )}
      >
        {!isCollapsed ? (
          <div className="w-full overflow-hidden flex items-center">
            <img
              src={logotipoLight}
              alt="Trainify"
              className="h-10 w-auto max-w-full object-contain dark:hidden"
            />
            <img
              src={logotipoDark}
              alt="Trainify"
              className="h-10 w-auto max-w-full object-contain hidden dark:block"
            />
          </div>
        ) : (
          <div
            className="w-10 h-10 shrink-0 flex items-center justify-center"
            title="Trainify"
          >
            <img
              src={logomarca}
              alt="Trainify Logo"
              className="w-full h-full object-contain"
            />
          </div>
        )}
      </div>

      <div className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            title={isCollapsed ? item.label : undefined}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 active:translate-y-[1px] w-full",
              activeTab === item.id
                ? "bg-primary-fixed text-primary font-semibold border-l-4 border-primary rounded-l-none"
                : "text-on-surface-variant hover:bg-surface-container",
              isCollapsed && "justify-center px-0 mx-auto",
            )}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!isCollapsed && (
              <span className="text-sm font-medium truncate">{item.label}</span>
            )}
          </button>
        ))}
      </div>

      <div
        className={cn(
          "border-t border-outline-variant flex flex-col gap-2",
          isCollapsed ? "p-3" : "p-4",
        )}
      >
        <button
          onClick={() => onTabChange("courses")}
          title={isCollapsed ? t("sidebar.startLearning") : undefined}
          className={cn(
            "w-full bg-primary-container text-white rounded-lg font-medium hover:opacity-90 transition-colors flex items-center justify-center gap-2 shadow-sm active:translate-y-[1px]",
            isCollapsed ? "p-2.5" : "px-4 py-2.5",
          )}
        >
          <Play className="w-4 h-4 fill-current shrink-0" />
          {!isCollapsed && (
            <span className="text-sm truncate">
              {t("sidebar.startLearning")}
            </span>
          )}
        </button>

        <div className="flex flex-col gap-1">
          <button
            onClick={() => onTabChange("settings")}
            title={isCollapsed ? t("nav.settings") : undefined}
            className={cn(
              "flex items-center gap-3 py-2 transition-all rounded-lg text-sm w-full",
              activeTab === "settings"
                ? "bg-primary-fixed text-primary"
                : "text-on-surface-variant hover:bg-surface-container",
              isCollapsed ? "justify-center px-0" : "px-3",
            )}
          >
            <Settings className="w-4 h-4 shrink-0" />
            {!isCollapsed && (
              <span className="truncate">{t("nav.settings")}</span>
            )}
          </button>
          <button
            onClick={() => onTabChange("support")}
            title={isCollapsed ? t("nav.support") : undefined}
            className={cn(
              "flex items-center gap-3 py-2 transition-all rounded-lg text-sm w-full",
              activeTab === "support"
                ? "bg-primary-fixed text-primary"
                : "text-on-surface-variant hover:bg-surface-container",
              isCollapsed ? "justify-center px-0" : "px-3",
            )}
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            {!isCollapsed && (
              <span className="truncate">{t("nav.support")}</span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
