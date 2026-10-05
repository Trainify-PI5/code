import { useEffect, useState } from "react";
import { User, Shield, Save, Eye, EyeOff, Lock } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuthStore } from "../store/authStore";
import { useLanguage } from "../contexts/LanguageContext";
import { PageContainer, PageHeader, useToast } from "../components/ui";
import { useRef } from "react";
import api from "../services/api";

type Tab = "profile" | "security";

export default function Settings() {
  const { user, updateUser } = useAuthStore();
  const { t } = useLanguage();
  const toast = useToast();
  const seletorFoto = useRef<HTMLInputElement>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileAttempt, setProfileAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadingProfile(true);
    setProfileLoaded(false);
    setProfileError("");
    api.get('/users/me').then(({ data }) => {
      if (cancelled) return;
      setName(data.name);
      setBio(data.bio || "");
      setProfileLoaded(true);
    }).catch(() => {
      if (!cancelled) setProfileError("Não foi possível carregar o perfil. Tente novamente.");
    }).finally(() => {
      if (!cancelled) setLoadingProfile(false);
    });
    return () => { cancelled = true; };
  }, [user?.id, profileAttempt]);

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profileLoaded || savingProfile) return;
    if (!name.trim()) {
      setProfileError("Informe seu nome.");
      return;
    }
    setSavingProfile(true);
    setProfileError("");
    try {
      const { data } = await api.put('/users/me', { name: name.trim(), email: user?.email, bio });
      setName(data.name);
      setBio(data.bio || "");
      updateUser({ name: data.name, bio: data.bio });
      toast.success("Perfil atualizado.");
    } catch {
      setProfileError("Não foi possível atualizar o perfil. Tente novamente.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Tres passos: pede a URL assinada, envia o arquivo direto para o Storage e
  // so entao grava a chave no usuario.
  const trocarFoto = async (arquivo: File) => {
    if (!arquivo.type.startsWith("image/")) {
      toast.warning("Escolha um arquivo de imagem.");
      return;
    }
    if (arquivo.size > 5 * 1024 * 1024) {
      toast.warning("A imagem precisa ter no máximo 5 MB.");
      return;
    }

    setEnviandoFoto(true);
    try {
      const { data: assinada } = await api.post("/media/avatar-upload-url", {
        filename: arquivo.name,
        contentType: arquivo.type,
      });

      // PUT direto no Storage: sem o header de autenticacao da nossa API,
      // senao a assinatura da URL e recusada.
      const envio = await fetch(assinada.url, {
        method: "PUT",
        body: arquivo,
        headers: { "Content-Type": arquivo.type },
      });
      if (!envio.ok) throw new Error(`Storage respondeu ${envio.status}`);

      const { data: atualizado } = await api.patch(`/users/${user?.id}/avatar`, {
        avatarKey: assinada.key,
      });
      // A resposta ja traz a URL assinada da foto; reflete na hora.
      updateUser({ avatar: atualizado.avatar });
      toast.success("Foto atualizada.");
    } catch (err) {
      console.error("Erro ao trocar a foto", err);
      toast.error("Não foi possível enviar a foto.");
    } finally {
      setEnviandoFoto(false);
      if (seletorFoto.current) seletorFoto.current.value = "";
    }
  };
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingPassword) return;
    setPasswordError("");
    if (newPassword !== confirmPassword) {
      setPasswordError(t("settings.passwordMismatch"));
      return;
    }
    setSavingPassword(true);
    try {
      await api.patch("/users/me/password", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(t("settings.passwordUpdated"));
    } catch (error: any) {
      setPasswordError(error.response?.status === 400 && error.response?.data?.detail
        ? error.response.data.detail
        : t("settings.passwordError"));
    } finally {
      setSavingPassword(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "profile", label: t("settings.profile") || "Meu Perfil", icon: User },
    {
      id: "security",
      label: t("settings.security") || "Segurança",
      icon: Shield,
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={t("settings.title") || "Configurações"}
        subtitle={t("settings.subtitle") || "Gerencie as preferências da sua conta."}
      />

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
            <form onSubmit={saveProfile} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 shadow-sm space-y-6">
              <h3 className="text-lg font-display font-bold border-b border-outline-variant pb-4">
                {t("settings.personalInfo") || "Informações Pessoais"}
              </h3>

              <div className="flex items-center gap-6">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full bg-primary-container flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={`Foto de ${user.name}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      user?.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase() || "U"
                    )}
                  </div>
                  <input
                    ref={seletorFoto}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const arquivo = e.target.files?.[0];
                      if (arquivo) trocarFoto(arquivo);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => seletorFoto.current?.click()}
                    disabled={enviandoFoto}
                    className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold uppercase disabled:cursor-not-allowed"
                  >
                    {enviandoFoto ? "..." : t("settings.change") || "Alterar"}
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
                  <label htmlFor="profile-name" className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                    {t("settings.fullName") || "Nome Completo"}
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={100}
                    disabled={!profileLoaded || savingProfile}
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
                  <label htmlFor="profile-bio" className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                    {t("settings.bio") || "Bio"}
                  </label>
                  <textarea
                    id="profile-bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={1000}
                    disabled={!profileLoaded || savingProfile}
                    rows={3}
                    className="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2 text-sm focus:border-primary outline-none resize-none transition-all text-on-surface"
                    placeholder={
                      t("settings.bioPlaceholder") ||
                      "Fale um pouco sobre você..."
                    }
                  />
                </div>
              </div>

              {loadingProfile && <p role="status">Carregando perfil...</p>}
              {profileError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{profileError}</p>}
              {!loadingProfile && !profileLoaded && (
                <button type="button" onClick={() => setProfileAttempt((attempt) => attempt + 1)} className="text-primary underline">Tentar novamente</button>
              )}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={!profileLoaded || savingProfile}
                  aria-busy={savingProfile}
                  className="bg-primary-container text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {t("settings.save") || "Salvar Alterações"}
                </button>
              </div>
            </form>
          )}

          {activeTab === "security" && (
            <form onSubmit={changePassword} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 shadow-sm space-y-6">
              <h3 className="text-lg font-display font-bold border-b border-outline-variant pb-4">
                {t("settings.changePassword") || "Alterar Senha"}
              </h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="current-pwd" className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                    {t("settings.currentPassword") || "Senha Atual"}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                    <input
                      id="current-pwd"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                      disabled={savingPassword}
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
                  <label htmlFor="new-pwd" className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                    {t("settings.newPassword") || "Nova Senha"}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                    <input
                      id="new-pwd"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      minLength={6}
                      required
                      disabled={savingPassword}
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
                  <label htmlFor="confirm-pwd" className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                    {t("settings.confirmNewPassword") || "Confirmar Nova Senha"}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                    <input
                      id="confirm-pwd"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      minLength={6}
                      required
                      disabled={savingPassword}
                      type="password"
                      placeholder="••••••••"
                      className="w-full bg-surface-bright border border-outline-variant rounded-lg pl-10 pr-4 py-2.5 text-sm focus:border-primary outline-none transition-all text-on-surface"
                    />
                  </div>
                </div>
              </div>

              {passwordError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  aria-busy={savingPassword}
                  className="bg-primary-container text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {t("settings.updatePassword") || "Atualizar Senha"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
