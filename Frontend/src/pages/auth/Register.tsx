import { useState } from "react";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Building2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ChevronLeft,
} from "lucide-react";
import { motion } from "motion/react";
import logotipoLight from "../../assets/images/logotipo-modo_light.svg";
import logotipoDark from "../../assets/images/logotipo-modo_dark.svg";
import { useAuthStore } from "../../store/authStore";
import { useThemeStore } from "../../store/themeStore";
import { cn } from "../../lib/utils";
import ThemeToggle from "../../components/ThemeToggle";

interface RegisterProps {
  onNavigate: (page: "login" | "forgot-password") => void;
}

const departments = [
  "Engenharia",
  "Design",
  "Marketing",
  "Vendas",
  "Recursos Humanos",
  "Produto",
  "Operações",
  "Financeiro",
  "Jurídico",
  "Outro",
];

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "Mínimo 8 caracteres", ok: password.length >= 8 },
    { label: "Letra maiúscula", ok: /[A-Z]/.test(password) },
    { label: "Número", ok: /[0-9]/.test(password) },
    { label: "Caractere especial", ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const colors = [
    "bg-red-400",
    "bg-orange-400",
    "bg-yellow-400",
    "bg-green-400",
  ];
  const labels = ["Fraca", "Razoável", "Boa", "Forte"];
  if (!password) return null;
  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              i < score ? colors[score - 1] : "bg-outline-variant",
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-on-surface-variant">Força da senha</span>
        {score > 0 && (
          <span
            className={cn(
              "text-xs font-semibold",
              score <= 1
                ? "text-red-500"
                : score <= 2
                  ? "text-orange-500"
                  : score === 3
                    ? "text-yellow-600"
                    : "text-green-600",
            )}
          >
            {labels[score - 1]}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {checks.map((c) => (
          <div
            key={c.label}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors",
              c.ok
                ? "text-green-600 dark:text-green-400"
                : "text-on-surface-variant",
            )}
          >
            <CheckCircle2
              className={cn(
                "w-3 h-3 shrink-0",
                c.ok ? "opacity-100" : "opacity-30",
              )}
            />
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Register({ onNavigate }: RegisterProps) {
  const { register, isLoading, error, clearError } = useAuthStore();
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const [form, setForm] = useState({
    name: "",
    email: "",
    department: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const update = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    clearError();
  };
  const blur = (field: string) => setTouched((p) => ({ ...p, [field]: true }));

  const validations = {
    name: form.name.trim().length >= 2,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email),
    password: form.password.length >= 8,
    confirmPassword:
      form.password === form.confirmPassword && form.confirmPassword.length > 0,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
    });
    if (
      !validations.name ||
      !validations.email ||
      !validations.password ||
      !validations.confirmPassword ||
      !agreed
    )
      return;
    await register({
      name: form.name.trim(),
      email: form.email,
      password: form.password,
      department: form.department || undefined,
    });
  };

  return (
    <div className="min-h-screen flex bg-surface-bright">
      {/* Esquerda — Painel de Marca */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 bg-gradient-to-br from-[#1a0550] via-[#2d0d7a] to-[#452097] px-14 py-12 relative overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-20 -left-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />

        <div className="flex items-center relative z-10">
          <img
            src={logotipoLight}
            alt="Trainify"
            className="h-9 w-auto object-contain"
          />
        </div>

        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-display font-extrabold text-white leading-tight">
              Comece sua jornada
              <br />
              de crescimento.
            </h2>
            <p className="text-purple-200/80 text-lg leading-relaxed">
              Crie sua conta gratuitamente e desbloqueie acesso a centenas de
              trilhas de aprendizado.
            </p>
          </div>
          <div className="space-y-4">
            {[
              "Trilhas personalizadas por IA",
              "Certificações reconhecidas pelo mercado",
              "Acompanhe seu progresso em tempo real",
            ].map((text) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-300 rounded-full shrink-0" />
                <span className="text-purple-100 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-purple-200/40 text-xs relative z-10">
          © {new Date().getFullYear()} Trainify. Todos os direitos reservados.
        </p>
      </motion.div>

      {/* Direita — Formulário */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="flex justify-end p-4 shrink-0">
          <ThemeToggle
            isDarkMode={isDarkMode}
            toggleDarkMode={toggleDarkMode}
          />
        </div>

        <div className="flex items-start justify-center px-6 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full max-w-md space-y-7"
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

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate("login")}
                className="text-on-surface-variant hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-surface-container"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-display font-extrabold text-on-surface">
                  Criar conta
                </h1>
                <p className="text-on-surface-variant text-sm mt-0.5">
                  Preencha os dados abaixo para se cadastrar.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                  Nome completo
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    onBlur={() => blur("name")}
                    placeholder="Seu nome completo"
                    autoComplete="name"
                    className={cn(
                      "w-full bg-surface-container-lowest border rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-all placeholder:text-outline-variant text-on-surface",
                      touched.name && !validations.name
                        ? "border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-400"
                        : "border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary",
                    )}
                  />
                </div>
                {touched.name && !validations.name && (
                  <p className="text-xs text-red-500">
                    Digite seu nome completo.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                  E-mail corporativo
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    onBlur={() => blur("email")}
                    placeholder="seu@empresa.com"
                    autoComplete="email"
                    className={cn(
                      "w-full bg-surface-container-lowest border rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-all placeholder:text-outline-variant text-on-surface",
                      touched.email && !validations.email
                        ? "border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-400"
                        : "border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary",
                    )}
                  />
                </div>
                {touched.email && !validations.email && (
                  <p className="text-xs text-red-500">
                    Insira um e-mail válido.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                  Departamento{" "}
                  <span className="normal-case font-normal">(opcional)</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                  <select
                    value={form.department}
                    onChange={(e) => update("department", e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-on-surface appearance-none"
                  >
                    <option value="">Selecione um departamento</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    onBlur={() => blur("password")}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={cn(
                      "w-full bg-surface-container-lowest border rounded-xl pl-10 pr-11 py-3 text-sm outline-none transition-all placeholder:text-outline-variant text-on-surface",
                      touched.password && !validations.password
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
                <PasswordStrength password={form.password} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                  Confirmar senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={(e) => update("confirmPassword", e.target.value)}
                    onBlur={() => blur("confirmPassword")}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={cn(
                      "w-full bg-surface-container-lowest border rounded-xl pl-10 pr-11 py-3 text-sm outline-none transition-all placeholder:text-outline-variant text-on-surface",
                      touched.confirmPassword && !validations.confirmPassword
                        ? "border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-400"
                        : form.confirmPassword && validations.confirmPassword
                          ? "border-green-400 focus:border-green-400"
                          : "border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                  >
                    {showConfirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {touched.confirmPassword && !validations.confirmPassword && (
                  <p className="text-xs text-red-500">
                    As senhas não coincidem.
                  </p>
                )}
                {form.confirmPassword && validations.confirmPassword && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Senhas conferem!
                  </p>
                )}
              </div>

              <label className="flex items-start gap-3 cursor-pointer select-none group mt-2">
                <div className="relative mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
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
                <span className="text-sm text-on-surface-variant leading-relaxed">
                  Li e aceito os{" "}
                  <a
                    href="#"
                    className="text-primary hover:underline font-medium"
                  >
                    Termos de Uso
                  </a>{" "}
                  e a{" "}
                  <a
                    href="#"
                    className="text-primary hover:underline font-medium"
                  >
                    Política de Privacidade
                  </a>
                  .
                </span>
              </label>
              {!agreed && Object.keys(touched).length > 0 && (
                <p className="text-xs text-red-500">
                  Você precisa aceitar os termos para continuar.
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary-container text-white py-3.5 rounded-xl font-bold text-sm hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Criando
                    conta...
                  </>
                ) : (
                  "Criar minha conta"
                )}
              </button>
            </form>

            <p className="text-center text-sm text-on-surface-variant">
              Já tem uma conta?{" "}
              <button
                type="button"
                onClick={() => onNavigate("login")}
                className="text-primary font-bold hover:underline transition-colors"
              >
                Entrar
              </button>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
