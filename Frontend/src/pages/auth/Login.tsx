import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import logotipoLight from "../../assets/images/logotipo-modo_light.svg";
import logotipoDark from "../../assets/images/logotipo-modo_dark.svg";
import { useAuthStore } from "../../store/authStore";
import { useThemeStore } from "../../store/themeStore";
import { cn } from "../../lib/utils";
import ThemeToggle from "../../components/ThemeToggle";

interface LoginProps {
  onNavigate: (page: "register" | "forgot-password") => void;
}

export default function Login({ onNavigate }: LoginProps) {
  const { login, isLoading, error, clearError } = useAuthStore();
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!emailValid || !passwordValid) return;
    await login(email, password);
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
            className="h-23 w-auto object-contain"
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

          <div className="grid grid-cols-3 gap-4">
            {[
              { value: "1.200+", label: "Cursos disponíveis" },
              { value: "98%", label: "Satisfação dos alunos" },
              { value: "45k", label: "Profissionais ativos" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm"
              >
                <div className="text-2xl font-display font-extrabold text-white">
                  {stat.value}
                </div>
                <div className="text-xs text-purple-200/70 mt-1 leading-tight">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-purple-200/40 text-xs relative z-10">
          © {new Date().getFullYear()} Trainify. Todos os direitos reservados.
        </p>
      </motion.div>

      {/* Direita — Formulário de Login */}
      <div className="flex-1 flex flex-col">
        <div className="flex justify-end p-4">
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
                src={logotipoDark}
                alt="Trainify"
                className="h-8 w-auto object-contain dark:hidden"
              />
              <img
                src={logotipoLight}
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



            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
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
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
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
                  <input type="checkbox" className="sr-only peer" />
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
                    <Loader2 className="w-4 h-4 animate-spin" /> Entrando...
                  </>
                ) : (
                  "Entrar na plataforma"
                )}
              </button>
            </form>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-outline-variant" />
              <span className="text-xs text-on-surface-variant font-medium">
                OU
              </span>
              <div className="flex-1 h-px bg-outline-variant" />
            </div>

            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 border border-outline-variant bg-surface-container-lowest rounded-xl py-3 text-sm font-medium text-on-surface hover:bg-surface-container transition-colors active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Entrar com Google
            </button>


          </motion.div>
        </div>
      </div>
    </div>
  );
}
