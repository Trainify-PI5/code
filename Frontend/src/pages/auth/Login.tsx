import { useEffect, useState } from "react";
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import logotipoLight from "../../assets/images/logotipo-modo_light.svg";
import logotipoDark from "../../assets/images/logotipo-modo_dark.svg";
import { useAuthStore } from "../../store/authStore";
import { aoAcordarServidor } from "../../services/api";
import { useThemeStore } from "../../store/themeStore";
import { cn } from "../../lib/utils";
import ThemeToggle from "../../components/ThemeToggle";

interface LoginProps {
  onNavigate: (page: "register" | "forgot-password") => void;
}

export default function Login({ onNavigate }: LoginProps) {
  const { login, isLoading, error, clearError, tenantOptions, clearTenantOptions } = useAuthStore();

  // O servidor do plano gratuito hiberna; enquanto ele sobe, avisamos em vez de
  // deixar a pessoa achando que travou
  const [servidorAcordando, setServidorAcordando] = useState(false);
  useEffect(() => aoAcordarServidor(setServidorAcordando), []);
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 6;

  const entrarNaEmpresa = async (tenantId: string) => {
    await login(email, password, rememberMe, tenantId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!emailValid || !passwordValid) return;
    await login(email, password, rememberMe);
  };

  return (
    <div className="min-h-screen flex bg-surface-bright">
      {/* Esquerda — Painel de Marca */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="hidden lg:flex flex-col justify-between w-[520px] shrink-0 bg-gradient-to-br from-[#1a0550] via-[#2d0d7a] to-[#452097] px-14 py-12 relative overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-20 -left-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-40 right-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

        <div className="flex items-center relative z-10">
          <img
            src={logotipoDark}
            alt="Trainify"
            className="h-28 w-auto object-contain"
          />
        </div>

        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-display font-extrabold text-white leading-tight">
              O aprendizado que
              <br />
              transforma carreiras.
            </h2>
            <p className="text-purple-200/80 text-lg leading-relaxed">
              Acesse trilhas de aprendizado personalizadas, certificações e
              ferramentas para desenvolver o seu potencial.
            </p>
          </div>

        </div>

        <p className="text-purple-200/40 text-xs relative z-10">
          © {new Date().getFullYear()} Trainify. Todos os direitos reservados.
        </p>
      </motion.div>

      {/* Direita — Formulário de Login */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-4 p-4">
          <a href="/" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary-fixed">
            <ArrowLeft className="h-4 w-4" /> Voltar ao início
          </a>
          <ThemeToggle
            isDarkMode={isDarkMode}
            toggleDarkMode={toggleDarkMode}
          />
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full max-w-md space-y-8"
          >
            <div className="flex items-center lg:hidden mb-4">
              <img
                src={logotipoLight}
                alt="Trainify"
                className="h-8 w-auto object-contain dark:hidden"
              />
              <img
                src={logotipoDark}
                alt="Trainify"
                className="h-8 w-auto object-contain hidden dark:block"
              />
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-display font-extrabold text-on-surface">
                Bem-vindo de volta
              </h1>
              <p className="text-on-surface-variant text-base">
                Entre na sua conta para continuar aprendendo.
              </p>
            </div>



            {tenantOptions.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-on-surface">Escolha a empresa</h2>
                  <p className="text-sm text-on-surface-variant">
                    Este e-mail tem acesso a mais de uma empresa. Em qual você quer entrar?
                  </p>
                </div>

                <div className="space-y-2">
                  {tenantOptions.map((empresa) => (
                    <button
                      key={empresa.id}
                      type="button"
                      disabled={isLoading}
                      onClick={() => entrarNaEmpresa(empresa.id)}
                      className="w-full text-left px-4 py-3 rounded-xl border border-outline-variant hover:border-primary hover:bg-primary-fixed transition-colors font-medium text-on-surface disabled:opacity-60"
                    >
                      {empresa.name}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={clearTenantOptions}
                  className="text-sm text-on-surface-variant underline"
                >
                  Usar outro e-mail
                </button>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className={cn("space-y-5", tenantOptions.length > 0 && "hidden")}
              noValidate
            >
              {servidorAcordando && !error && (
                <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                  <span>Iniciando o servidor. O primeiro acesso do dia pode levar até um minuto.</span>
                </div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                  <button
                    type="button"
                    onClick={clearError}
                    className="ml-auto text-red-400 hover:text-red-600 transition-colors text-xs underline"
                  >
                    Fechar
                  </button>
                </motion.div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-on-surface">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearError();
                    }}
                    onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                    placeholder="seu@email.com"
                    autoComplete="email"
                    className={cn(
                      "w-full bg-surface-container-lowest border rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-all placeholder:text-outline-variant text-on-surface",
                      touched.email && !emailValid
                        ? "border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-400"
                        : "border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary",
                    )}
                  />
                </div>
                {touched.email && !emailValid && (
                  <p className="text-xs text-red-500 mt-1">
                    Insira um e-mail válido.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-on-surface">
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={() => onNavigate("forgot-password")}
                    className="text-xs text-primary hover:underline font-medium transition-colors"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearError();
                    }}
                    onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={cn(
                      "w-full bg-surface-container-lowest border rounded-xl pl-10 pr-11 py-3 text-sm outline-none transition-all placeholder:text-outline-variant text-on-surface",
                      touched.password && !passwordValid
                        ? "border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-400"
                        : "border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {touched.password && !passwordValid && (
                  <p className="text-xs text-red-500 mt-1">
                    A senha deve ter pelo menos 6 caracteres.
                  </p>
                )}
              </div>

              <label className="flex items-center gap-3 cursor-pointer select-none group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-4 h-4 border-2 border-outline-variant rounded peer-checked:bg-primary peer-checked:border-primary transition-colors group-hover:border-primary" />
                  <svg
                    className="absolute top-0.5 left-0.5 w-3 h-3 text-white hidden peer-checked:block pointer-events-none"
                    fill="none"
                    viewBox="0 0 12 12"
                  >
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="text-sm text-on-surface-variant">
                  Manter-me conectado
                </span>
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary-container text-white py-3.5 rounded-xl font-bold text-sm hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {servidorAcordando ? "Iniciando o servidor..." : "Entrando..."}
                  </>
                ) : (
                  "Entrar na plataforma"
                )}
              </button>
            </form>

          </motion.div>
        </div>
      </div>
    </div>
  );
}
