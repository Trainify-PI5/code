import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  Award,
  Users,
  Shield,
  Zap,
  ChevronDown,
  Menu,
  X,
  Clock,
} from "lucide-react";
import logotipoLight from "../assets/images/logotipo-modo_light.svg";
import logotipoDark from "../assets/images/logotipo-modo_dark.svg";
import ThemeToggle from "../components/ThemeToggle";
import { useThemeStore } from "../store/themeStore";

interface LandingPageProps {
  onGoToLogin: () => void;
  onContact: () => void;
}

export default function LandingPage({ onGoToLogin, onContact }: LandingPageProps) {
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    {
      icon: BookOpen,
      title: "Trilhas de Aprendizado",
      desc: "Crie percursos personalizados com vídeos, quizzes e materiais de leitura organizados por módulos.",
    },
    {
      icon: BarChart3,
      title: "Dashboards Analíticos",
      desc: "Acompanhe matrículas, progresso e resultados dos cursos.",
    },
    {
      icon: Bot,
      title: "Assistente de IA",
      desc: "Consulte o assistente para tirar dúvidas sobre os conteúdos dos cursos.",
    },
    {
      icon: Award,
      title: "Certificações",
      desc: "Consulte e baixe os certificados disponíveis na sua conta.",
    },
    {
      icon: Users,
      title: "Gestão de Equipes",
      desc: "Gerencie alunos, instrutores e gestores com controle de acesso granular por perfil.",
    },
    {
      icon: Shield,
      title: "Multi-Tenant Seguro",
      desc: "Organize usuários e cursos no ambiente da sua empresa.",
    },
  ];

  const faqs = [
    { q: "Como acesso a plataforma?", a: "Use o botão Entrar e informe o e-mail e a senha da sua conta." },
    { q: "Como recupero minha senha?", a: "Na tela de login, selecione Esqueceu a senha? e informe seu e-mail." },
    { q: "Onde encontro meus cursos?", a: "Após entrar, acesse Cursos no menu da plataforma." },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans">
      {/* ── NAVBAR ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/90 dark:bg-gray-950/90 backdrop-blur-md shadow-sm border-b border-gray-100 dark:border-gray-800" : "bg-transparent"}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-3">
          <img
            src={logotipoLight}
            alt="Trainify"
            className="h-12 sm:h-14 w-auto shrink-0 dark:hidden"
          />
          <img
            src={logotipoDark}
            alt="Trainify"
            className="h-12 sm:h-14 w-auto shrink-0 hidden dark:block"
          />

          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-400">
            <a
              href="#features"
              className="hover:text-purple-700 dark:hover:text-purple-400 transition-colors"
            >
              Funcionalidades
            </a>
            <a
              href="#faq"
              className="hover:text-purple-700 dark:hover:text-purple-400 transition-colors"
            >
              FAQ
            </a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onGoToLogin}
              className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-purple-700 dark:hover:text-purple-400 transition-colors px-4 py-2"
            >
              Entrar
            </button>
            <button
              onClick={onContact}
              className="bg-[#4B2C92] hover:bg-[#3a1f75] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              Solicitar demonstração
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
          <button
            type="button"
            aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 px-4 pb-4 space-y-1"
            >
              {["Funcionalidades", "FAQ"].map(
                (item) => (
                  <a
                    key={item}
                    href={item === "Funcionalidades" ? "#features" : "#faq"}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-purple-700 border-b border-gray-100 dark:border-gray-800"
                  >
                    {item}
                  </a>
                ),
              )}
              <div className="pt-3 flex flex-col gap-2">
                <button
                  onClick={onGoToLogin}
                  className="w-full text-sm font-medium text-gray-700 dark:text-gray-300 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl"
                >
                  Entrar
                </button>
                <button
                  onClick={onContact}
                  className="w-full bg-[#4B2C92] text-white text-sm font-semibold py-2.5 rounded-xl"
                >
                  Solicitar demonstração
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── HERO ── */}
      <section className="relative pt-28 pb-20 sm:pt-36 sm:pb-28 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-purple-50/30 dark:from-purple-950/20 dark:via-gray-950 dark:to-gray-950 pointer-events-none" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-purple-200/30 dark:bg-purple-900/20 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-200/20 dark:bg-indigo-900/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-bold px-4 py-2 rounded-full mb-6 tracking-wide"
            >
              <Zap className="w-3.5 h-3.5" />
              PLATAFORMA LMS B2B — NOVA GERAÇÃO
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-gray-900 dark:text-white leading-tight mb-6"
            >
              Capacite sua equipe com{" "}
              <span className="text-[#4B2C92] dark:text-purple-400">
                dados confiáveis
              </span>{" "}
              e estrutura de verdade.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 leading-relaxed mb-10 max-w-2xl mx-auto"
            >
              O Trainify é a plataforma LMS que profissionaliza o T&D, engaja
              times e constrói cultura de aprendizado com consistência — com IA
              integrada do início ao fim.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              <button
                onClick={onContact}
                className="bg-[#4B2C92] hover:bg-[#3a1f75] text-white font-bold px-8 py-4 rounded-xl text-base transition-all shadow-lg shadow-purple-200 dark:shadow-purple-900/30 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                Solicitar demonstração{" "}
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onGoToLogin}
                className="border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold px-8 py-4 rounded-xl text-base transition-all flex items-center justify-center gap-2"
              >
                Entrar na minha conta
              </button>
            </motion.div>

            <p className="mt-4 text-xs text-gray-500 dark:text-gray-500 flex items-center justify-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Acesse com a conta fornecida pela sua organização.
            </p>
          </div>

        </div>
      </section>

      {/* ── FEATURES ── */}
      <section
        id="features"
        className="py-20 sm:py-28 px-4 bg-gray-50 dark:bg-gray-900/30"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 tracking-widest uppercase">
              Funcionalidades
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-gray-900 dark:text-white mt-3 mb-4">
              Tudo que sua universidade corporativa precisa
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-base sm:text-lg">
              Do criador de cursos ao assistente de IA — uma plataforma
              completa, sem precisar de integrações externas.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md hover:border-purple-200 dark:hover:border-purple-800 transition-all group"
              >
                <div className="w-11 h-11 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-200 dark:group-hover:bg-purple-800/50 transition-colors">
                  <f.icon className="w-5 h-5 text-[#4B2C92] dark:text-purple-400" />
                </div>
                <h3 className="text-base font-display font-bold text-gray-900 dark:text-white mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section
        id="faq"
        className="py-20 sm:py-28 px-4 bg-white dark:bg-gray-950"
      >
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 tracking-widest uppercase">
              FAQ
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-gray-900 dark:text-white mt-3">
              Perguntas frequentes
            </h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  {faq.q}
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-4 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-20 sm:py-28 px-4 bg-gradient-to-br from-[#2d0d7a] via-[#4B2C92] to-[#452097]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-white mb-4">
            Pronto para transformar o T&D da sua empresa?
          </h2>
          <p className="text-purple-200 text-lg mb-8">
            Organize cursos, acompanhe o aprendizado e desenvolva sua equipe.
          </p>
          <button
            onClick={onContact}
            className="bg-white text-[#4B2C92] hover:bg-purple-50 font-bold px-10 py-4 rounded-xl text-base transition-all shadow-lg flex items-center gap-2 mx-auto active:scale-[0.98]"
          >
            Solicitar demonstração <ArrowRight className="w-4 h-4" />
          </button>
          <p className="mt-4 text-purple-300 text-sm flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Cursos e progresso em um só lugar
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-950 text-gray-400 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <img src={logotipoDark} alt="Trainify" className="h-12 sm:h-14 w-auto" />
            <p className="text-xs">
              © {new Date().getFullYear()} Trainify. Todos os direitos
              reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
