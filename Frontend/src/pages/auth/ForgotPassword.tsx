import { useState } from "react";
import {
  Mail,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ChevronLeft,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import logotipoLight from "../../assets/images/logotipo-modo_light.svg";
import logotipoDark from "../../assets/images/logotipo-modo_dark.svg";
import { useAuthStore } from "../../store/authStore";
import { useThemeStore } from "../../store/themeStore";
import { cn } from "../../lib/utils";
import ThemeToggle from "../../components/ThemeToggle";

interface ForgotPasswordProps {
  onNavigate: (page: "login" | "register") => void;
}

export default function ForgotPassword({ onNavigate }: ForgotPasswordProps) {
  const { forgotPassword, isLoading, error, clearError } = useAuthStore();
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [touched, setTouched] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!emailValid) return;
    await forgotPassword(email);
    if (!error) setSent(true);
  };

  return (
    <div className="min-h-screen flex bg-surface-bright">
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

        <div className="relative z-10 space-y-6">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <div className="space-y-3">
            <h2 className="text-4xl font-display font-extrabold text-white leading-tight">
              Recuperação
              <br />
              de acesso segura.
            </h2>
            <p className="text-purple-200/80 text-lg leading-relaxed">
              Enviaremos um link seguro para o seu e-mail cadastrado. O link
              expira em 30 minutos.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/10 rounded-xl p-4">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shrink-0" />
            <span className="text-purple-100 text-sm">
              Seus dados estão seguros e criptografados.
            </span>
          </div>
        </div>

        <p className="text-purple-200/40 text-xs relative z-10">
          © {new Date().getFullYear()} Trainify. Todos os direitos reservados.
        </p>
      </motion.div>

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
            className="w-full max-w-md"
          >
            <div className="flex items-center lg:hidden mb-8">
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

            <AnimatePresence mode="wait">
              {!sent ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-7"
                >
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
                        Esqueceu a senha?
                      </h1>
                      <p className="text-on-surface-variant text-sm mt-0.5">
                        Digite seu e-mail para receber o link de redefinição.
                      </p>
                    </div>
                  </div>

                  <form
                    onSubmit={handleSubmit}
                    className="space-y-5"
                    noValidate
                  >
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
                        E-mail cadastrado
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
                          onBlur={() => setTouched(true)}
                          placeholder="seu@email.com"
                          autoComplete="email"
                          className={cn(
                            "w-full bg-surface-container-lowest border rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-all placeholder:text-outline-variant text-on-surface",
                            touched && !emailValid
                              ? "border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-400"
                              : "border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary",
                          )}
                        />
                      </div>
                      {touched && !emailValid && (
                        <p className="text-xs text-red-500">
                          Insira um e-mail válido.
                        </p>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-primary-container text-white py-3.5 rounded-xl font-bold text-sm hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />{" "}
                          Enviando...
                        </>
                      ) : (
                        <>
                          <span>Enviar link de redefinição</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>

                  <p className="text-center text-sm text-on-surface-variant">
                    Lembrou a senha?{" "}
                    <button
                      type="button"
                      onClick={() => onNavigate("login")}
                      className="text-primary font-bold hover:underline transition-colors"
                    >
                      Voltar ao login
                    </button>
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-7 text-center"
                >
                  <div className="flex flex-col items-center gap-5">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-950/40 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="space-y-2">
                      <h1 className="text-3xl font-display font-extrabold text-on-surface">
                        E-mail enviado!
                      </h1>
                      <p className="text-on-surface-variant leading-relaxed">
                        Enviamos um link de redefinição para{" "}
                        <span className="font-semibold text-on-surface">
                          {email}
                        </span>
                        . Verifique sua caixa de entrada e a pasta de spam.
                      </p>
                    </div>
                  </div>

                  <div className="bg-surface-container rounded-2xl p-5 text-left space-y-3">
                    <p className="text-sm font-bold text-on-surface">
                      Próximos passos:
                    </p>
                    {[
                      "Abra o e-mail enviado pelo Trainify",
                      'Clique em "Redefinir minha senha"',
                      "Crie uma nova senha segura",
                      "O link expira em 30 minutos",
                    ].map((step, i) => (
                      <div
                        key={step}
                        className="flex items-center gap-3 text-sm text-on-surface-variant"
                      >
                        <div className="w-6 h-6 bg-primary-fixed rounded-full flex items-center justify-center text-primary font-bold text-xs shrink-0">
                          {i + 1}
                        </div>
                        {step}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSent(false);
                        setEmail("");
                      }}
                      className="w-full border border-outline-variant text-on-surface py-3 rounded-xl font-medium text-sm hover:bg-surface-container transition-colors active:scale-[0.98]"
                    >
                      Tentar com outro e-mail
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate("login")}
                      className="w-full bg-primary-container text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all active:scale-[0.98]"
                    >
                      Voltar ao login
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
