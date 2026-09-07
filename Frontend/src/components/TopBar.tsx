import { useState, useRef, useEffect } from "react";
import {
  Search,
  Bell,
  ChevronDown,
  PanelLeft,
  PanelLeftClose,
  Sun,
  Moon,
  Globe,
  LogOut,
  User,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuthStore } from "../store/authStore";
import { NotificationsPopover } from "./NotificationsPopover";

interface TopBarProps {
  onNotify: () => void;
  onSupport: () => void;
  onSettings: () => void;
  onProfile: () => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export default function TopBar({
  onNotify,
  onSupport,
  onSettings,
  onProfile,
  isSidebarCollapsed,
  toggleSidebar,
  isDarkMode,
  toggleDarkMode,
}: TopBarProps) {
  const { language, setLanguage, t } = useLanguage();
  const { user, logout } = useAuthStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (searchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [searchOpen]);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  return (
    <>
      <header className="sticky top-0 z-30 w-full border-b border-outline-variant bg-surface-container-lowest/80 backdrop-blur-md font-display transition-colors duration-200">
        <div className="flex justify-between items-center h-16 px-4 sm:px-6 lg:px-8 w-full">
          {/* Lado Esquerdo */}
          <div className="flex items-center w-1/4 sm:w-1/3 min-w-0">
            {/* Botão menu — funciona como hambúrguer em mobile, colapso em desktop */}
            <button
              onClick={toggleSidebar}
              className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-lg hover:bg-surface-container active:scale-95 shrink-0"
              title={
                isSidebarCollapsed ? t("topbar.expand") : t("topbar.collapse")
              }
            >
              <Menu className="w-5 h-5 lg:hidden" />
              <span className="hidden lg:block">
                {isSidebarCollapsed ? (
                  <PanelLeft className="w-5 h-5" />
                ) : (
                  <PanelLeftClose className="w-5 h-5" />
                )}
              </span>
            </button>
          </div>

          {/* Centro (Busca) */}
          <div className="hidden md:flex justify-center flex-1 max-w-2xl px-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
              <input
                type="text"
                placeholder={t("topbar.search")}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-sans placeholder:text-outline-variant text-on-surface shadow-sm"
              />
            </div>
          </div>

          {/* Lado Direito */}
          <div className="flex items-center justify-end gap-1 sm:gap-2 w-auto md:w-1/3 shrink-0 ml-auto">
            {/* Botão de busca mobile */}
            <button
              onClick={() => setSearchOpen(true)}
              className="md:hidden text-on-surface-variant hover:text-primary transition-colors p-2 rounded-lg hover:bg-surface-container active:scale-95"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Seletor de idioma — só desktop */}
            <div className="relative group hidden md:flex items-center z-50 shrink-0 mr-1">
              <button className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors p-2 rounded-lg hover:bg-surface-container active:scale-95 text-sm font-medium">
                <Globe className="w-4 h-4" />
                <span className="uppercase">{language.split("-")[0]}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              <div className="absolute top-full right-0 mt-1 w-36 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-1 z-50">
                <button
                  onClick={() => setLanguage("pt-BR")}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm hover:bg-surface-container transition-colors",
                    language === "pt-BR" && "text-primary font-medium",
                  )}
                >
                  Português (BR)
                </button>
                <button
                  onClick={() => setLanguage("en")}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm hover:bg-surface-container transition-colors",
                    language === "en" && "text-primary font-medium",
                  )}
                >
                  English
                </button>
                <button
                  onClick={() => setLanguage("es")}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm hover:bg-surface-container transition-colors",
                    language === "es" && "text-primary font-medium",
                  )}
                >
                  Español
                </button>
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-container active:scale-95"
              title={isDarkMode ? t("topbar.lightMode") : t("topbar.darkMode")}
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            <NotificationsPopover />

            <div className="w-px h-6 bg-outline-variant mx-1 hidden lg:block" />

            <div className="relative ml-1" ref={dropdownRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant px-2 sm:px-3 py-1.5 rounded-full hover:bg-surface-container transition-colors active:scale-95"
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary-container flex items-center justify-center text-white text-xs font-bold">
                    {initials}
                  </div>
                )}
                <span className="text-sm font-medium text-on-surface hidden sm:inline">
                  {user?.name?.split(" ")[0] || t("topbar.profile")}
                </span>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-on-surface-variant transition-transform duration-200 hidden sm:block",
                    profileOpen && "rotate-180",
                  )}
                />
              </button>

              {profileOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg py-1.5 z-50">
                  <div className="px-4 py-3 border-b border-outline-variant">
                    <p className="text-sm font-bold text-on-surface truncate">
                      {user?.name}
                    </p>
                    <p className="text-xs text-on-surface-variant truncate">
                      {user?.email}
                    </p>
                    {user?.role && (
                      <p className="text-xs text-primary mt-0.5 font-medium truncate">
                        {user.role}
                      </p>
                    )}
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        onProfile();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                    >
                      <User className="w-4 h-4" />
                      {t("profile.myProfile") || "Meu Perfil"}
                    </button>
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        onSettings();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      {t("nav.settings")}
                    </button>
                  </div>
                  <div className="border-t border-outline-variant py-1">
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      {t("profile.logout") || "Sair da conta"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Search overlay — mobile */}
      {searchOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-surface-bright/95 backdrop-blur-sm flex flex-col">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant">
            <Search className="w-5 h-5 text-on-surface-variant shrink-0" />
            <input
              ref={searchRef}
              type="text"
              placeholder={t("topbar.search")}
              className="flex-1 bg-transparent outline-none text-base text-on-surface placeholder:text-outline-variant"
            />
            <button
              onClick={() => setSearchOpen(false)}
              className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center text-on-surface-variant text-sm">
            Digite para pesquisar...
          </div>
        </div>
      )}
    </>
  );
}
