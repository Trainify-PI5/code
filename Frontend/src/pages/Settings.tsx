import { useState } from "react";
import { User, Shield, Save, Eye, EyeOff, Lock } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuthStore } from "../store/authStore";
import { useLanguage } from "../contexts/LanguageContext";

type Tab = "profile" | "security";

export default function Settings() {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "profile", label: t("settings.profile") || "Meu Perfil", icon: User },
    {
      id: "security",
      label: t("settings.security") || "Segurança",
      icon: Shield,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="border-b border-outline-variant pb-6">
        <h1 className="text-3xl font-display font-bold text-on-surface">
          {t("settings.title") || "Configurações"}
        </h1>
        <p className="text-on-surface-variant mt-1">
          {t("settings.subtitle") || "Gerencie as preferências da sua conta."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <aside className="space-y-1">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium",
                activeTab === item.id
                  ? "bg-primary-fixed text-primary"
                  : "text-on-surface-variant hover:bg-surface-container",
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </aside>

        <div className="md:col-span-2 space-y-8">
          {activeTab === "profile" && (
            <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 shadow-sm space-y-6">
              <h3 className="text-lg font-display font-bold border-b border-outline-variant pb-4">
                {t("settings.personalInfo") || "Informações Pessoais"}
              </h3>

              <div className="flex items-center gap-6">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full bg-primary-container flex items-center justify-center text-white text-2xl font-bold">
                    {user?.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase() || "U"}
                  </div>
                  <button className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold uppercase">
                    {t("settings.change") || "Alterar"}
                  </button>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-on-surface">
                    {user?.name || "—"}
                  </h4>
                  <p className="text-xs text-on-surface-variant">
                    {user?.email || "—"}
                  </p>
                  <p className="text-xs text-primary font-medium">
                    {user?.role || "—"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                    {t("settings.fullName") || "Nome Completo"}
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    defaultValue={user?.name || ""}
                    className="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2 text-sm focus:border-primary outline-none transition-all text-on-surface"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                    {t("settings.email") || "Email"}
                  </label>
                  <input
                    type="email"
                    defaultValue={user?.email || ""}
                    disabled
                    className="w-full bg-surface-container border border-outline-variant rounded-lg px-4 py-2 text-sm text-on-surface-variant cursor-not-allowed"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                    {t("settings.bio") || "Bio"}
                  </label>
                  <textarea
                    rows={3}
                    className="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2 text-sm focus:border-primary outline-none resize-none transition-all text-on-surface"
                    placeholder={
                      t("settings.bioPlaceholder") ||
                      "Fale um pouco sobre você..."
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  onClick={async () => {
                    const nameInput = document.getElementById("profile-name") as HTMLInputElement;
                    if(nameInput) {
                      try {
                        const api = await import("../services/api").then(m => m.default);
                        await api.put("/users/me", { name: nameInput.value, email: user?.email, avatar: user?.avatar });
                        alert("Perfil atualizado com sucesso!");
                      } catch (e) {
                        alert("Erro ao atualizar perfil");
                      }
                    }
                  }}
                  className="bg-primary-container text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center gap-2 shadow-sm active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  {t("settings.save") || "Salvar Alterações"}
                </button>
              </div>
            </section>
          )}

          {activeTab === "security" && (
            <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 shadow-sm space-y-6">
              <h3 className="text-lg font-display font-bold border-b border-outline-variant pb-4">
                {t("settings.changePassword") || "Alterar Senha"}
              </h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                    {t("settings.currentPassword") || "Senha Atual"}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="w-full bg-surface-bright border border-outline-variant rounded-lg pl-10 pr-10 py-2.5 text-sm focus:border-primary outline-none transition-all text-on-surface"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowCurrentPassword(!showCurrentPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                    {t("settings.newPassword") || "Nova Senha"}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                    <input
                      id="new-pwd"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="w-full bg-surface-bright border border-outline-variant rounded-lg pl-10 pr-10 py-2.5 text-sm focus:border-primary outline-none transition-all text-on-surface"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                    {t("settings.confirmNewPassword") || "Confirmar Nova Senha"}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                    <input
                      id="confirm-pwd"
                      type="password"
                      placeholder="••••••••"
                      className="w-full bg-surface-bright border border-outline-variant rounded-lg pl-10 pr-4 py-2.5 text-sm focus:border-primary outline-none transition-all text-on-surface"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  onClick={async () => {
                    const newPwd = (document.getElementById("new-pwd") as HTMLInputElement).value;
                    const confirmPwd = (document.getElementById("confirm-pwd") as HTMLInputElement).value;
                    if(newPwd !== confirmPwd) {
                      alert(t("settings.passwordMismatch") || "As senhas não coincidem!");
                      return;
                    }
                    if(!newPwd) return;
                    try {
                      const api = await import("../services/api").then(m => m.default);
                      await api.patch("/users/me/password", { newPassword: newPwd });
                      alert(t("settings.passwordUpdated") || "Senha atualizada com sucesso!");
                      (document.getElementById("new-pwd") as HTMLInputElement).value = "";
                      (document.getElementById("confirm-pwd") as HTMLInputElement).value = "";
                    } catch (e) {
                      alert(t("settings.passwordError") || "Erro ao atualizar senha");
                    }
                  }}
                  className="bg-primary-container text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center gap-2 shadow-sm active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  {t("settings.updatePassword") || "Atualizar Senha"}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
