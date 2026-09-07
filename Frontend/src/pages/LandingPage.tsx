import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Play,
  ArrowRight,
  CheckCircle2,
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
  Star,
  TrendingUp,
  Clock,
  Globe,
} from "lucide-react";
import logotipoLight from "../assets/images/logotipo-modo_light.svg";
import logotipoDark from "../assets/images/logotipo-modo_dark.svg";

interface LandingPageProps {
  onGoToLogin: () => void;
}

export default function LandingPage({ onGoToLogin }: LandingPageProps) {
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
      desc: "Acompanhe engajamento, taxas de conclusão e horas de treinamento por departamento em tempo real.",
    },
    {
      icon: Bot,
      title: "Assistente de IA",
      desc: "IA integrada para responder dúvidas dos alunos, sugerir conteúdos e gerar quizzes automaticamente.",
    },
    {
      icon: Award,
      title: "Certificações",
      desc: "Emita certificados automaticamente ao concluir cursos, com verificação de autenticidade integrada.",
    },
    {
      icon: Users,
      title: "Gestão de Equipes",
      desc: "Gerencie alunos, instrutores e gestores com controle de acesso granular por perfil.",
    },
    {
      icon: Shield,
      title: "Multi-Tenant Seguro",
      desc: "Cada empresa tem seu ambiente isolado com identidade visual própria — white-label completo.",
    },
  ];

  const stats = [
    { value: "1.200+", label: "Cursos disponíveis" },
    { value: "45k", label: "Profissionais treinados" },
    { value: "98%", label: "Satisfação dos alunos" },
    { value: "2mil+", label: "Empresas clientes" },
  ];

  const testimonials = [
    {
      name: "Fernanda Alves",
      role: "Head de RH · Grupo Votorantim",
      text: "O Trainify transformou nossa cultura de aprendizado. Hoje temos visibilidade total do engajamento e conseguimos agir com dados reais.",
      avatar: "FA",
      color: "bg-purple-100 text-purple-700",
    },
    {
      name: "Ricardo Mendes",
      role: "Diretor de T&D · Ambev",
      text: "A IA do Trainify economiza horas da equipe gerando quizzes e sugerindo trilhas personalizadas. É uma virada de chave no setor.",
      avatar: "RM",
      color: "bg-blue-100 text-blue-700",
    },
    {
      name: "Juliana Costa",
      role: "CHRO · iFood",
      text: "Implementamos em 3 dias. A plataforma é intuitiva para instrutores e alunos, e o suporte é excepcional. Recomendo sem hesitar.",
      avatar: "JC",
      color: "bg-green-100 text-green-700",
    },
  ];

  const plans = [
    {
      name: "Starter",
      price: "R$ 890",
      period: "/mês",
      desc: "Para equipes em crescimento",
      features: [
        "Até 50 usuários",
        "10 cursos ativos",
        "Certificações",
        "Suporte por e-mail",
      ],
      cta: "Começar grátis",
      highlighted: false,
    },
    {
      name: "Business",
      price: "R$ 2.490",
      period: "/mês",
      desc: "Para médias e grandes empresas",
      features: [
        "Usuários ilimitados",
        "Cursos ilimitados",
        "IA Assistant",
        "Dashboards analíticos",
        "White-label",
        "Suporte prioritário",
      ],
      cta: "Falar com vendas",
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "Sob consulta",
      period: "",
      desc: "Para corporações e grupos",
      features: [
        "Multi-tenant",
        "SSO / SAML",
        "API dedicada",
        "SLA garantido",
        "Gerente de sucesso",
      ],
      cta: "Solicitar proposta",
      highlighted: false,
    },
  ];

  const faqs = [
    {
      q: "Preciso de equipe técnica para implementar?",
      a: "Não. O Trainify é 100% SaaS — basta criar sua conta e começar. Nossa equipe de onboarding cuida de toda a configuração inicial.",
    },
    {
      q: "Posso personalizar com a identidade da minha empresa?",
      a: "Sim! O plano Business e Enterprise incluem white-label completo: logo, cores, domínio próprio e e-mails personalizados.",
    },
    {
      q: "Os dados dos meus colaboradores ficam seguros?",
      a: "Totalmente. Cada empresa tem seu ambiente isolado (multi-tenant). Seguimos as diretrizes da LGPD e nossos servidores ficam no Brasil.",
    },
    {
      q: "Como funciona a cobrança?",
      a: "Planos mensais sem fidelidade. Você pode cancelar a qualquer momento. Oferecemos 14 dias de teste gratuito sem cartão de crédito.",
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans">
      {/* ── NAVBAR ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/90 dark:bg-gray-950/90 backdrop-blur-md shadow-sm border-b border-gray-100 dark:border-gray-800" : "bg-transparent"}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <img
            src={logotipoLight}
            alt="Trainify"
            className="h-9 w-auto dark:hidden"
          />
          <img
            src={logotipoDark}
            alt="Trainify"
            className="h-9 w-auto hidden dark:block"
          />

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-400">
            <a
              href="#features"
              className="hover:text-purple-700 dark:hover:text-purple-400 transition-colors"
            >
              Funcionalidades
            </a>
            <a
              href="#testimonials"
              className="hover:text-purple-700 dark:hover:text-purple-400 transition-colors"
            >
              Depoimentos
            </a>
            <a
              href="#pricing"
              className="hover:text-purple-700 dark:hover:text-purple-400 transition-colors"
            >
              Planos
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
              onClick={onGoToLogin}
              className="bg-[#4B2C92] hover:bg-[#3a1f75] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              Começar grátis
            </button>
          </div>

          <button
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

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 px-4 pb-4 space-y-1"
            >
              {["Funcionalidades", "Depoimentos", "Planos", "FAQ"].map(
                (item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase()}`}
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
                  onClick={onGoToLogin}
                  className="w-full bg-[#4B2C92] text-white text-sm font-semibold py-2.5 rounded-xl"
                >
                  Começar grátis
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
                onClick={onGoToLogin}
                className="bg-[#4B2C92] hover:bg-[#3a1f75] text-white font-bold px-8 py-4 rounded-xl text-base transition-all shadow-lg shadow-purple-200 dark:shadow-purple-900/30 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                Solicitar demonstração gratuita{" "}
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onGoToLogin}
                className="border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold px-8 py-4 rounded-xl text-base transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" /> Ver demo em vídeo
              </button>
            </motion.div>

            <p className="mt-4 text-xs text-gray-500 dark:text-gray-500 flex items-center justify-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Sem compromisso. 14 dias
              grátis. Com atendimento especializado.
            </p>
          </div>

          {/* Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-16 relative max-w-5xl mx-auto"
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl shadow-purple-100/50 dark:shadow-purple-900/20 overflow-hidden">
              {/* Fake browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <div className="flex-1 mx-4 bg-white dark:bg-gray-800 rounded-md px-3 py-1 text-xs text-gray-400 font-mono border border-gray-200 dark:border-gray-700">
                  app.suaempresa.trainify.com/dashboard
                </div>
              </div>
              {/* Dashboard preview */}
              <div className="p-6 bg-gray-50 dark:bg-gray-900/50">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {[
                    {
                      label: "Novos Usuários",
                      value: "21",
                      icon: Users,
                      color: "text-purple-600",
                    },
                    {
                      label: "Usuários Ativos",
                      value: "32",
                      icon: TrendingUp,
                      color: "text-green-600",
                    },
                    {
                      label: "Matrículas",
                      value: "137",
                      icon: BookOpen,
                      color: "text-blue-600",
                    },
                  ].map((kpi) => (
                    <div
                      key={kpi.label}
                      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {kpi.label}
                        </span>
                      </div>
                      <div className="text-2xl font-display font-bold text-gray-900 dark:text-white">
                        {kpi.value}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Progresso da equipe
                    </span>
                    <span className="text-xs text-purple-600 font-medium">
                      Filtro: Mês
                    </span>
                  </div>
                  <div className="space-y-3">
                    {[
                      {
                        name: "Lucas Santana",
                        pct: 47,
                        color: "bg-purple-500",
                      },
                      {
                        name: "Bruno Oliveira",
                        pct: 78,
                        color: "bg-green-500",
                      },
                      { name: "Rafaela Costa", pct: 56, color: "bg-blue-500" },
                      { name: "Eduardo Lima", pct: 93, color: "bg-yellow-500" },
                    ].map((c) => (
                      <div key={c.name} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-[10px] font-bold text-purple-700 dark:text-purple-300 shrink-0">
                          {c.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-xs text-gray-700 dark:text-gray-300">
                              {c.name}
                            </span>
                            <span className="text-xs font-bold text-gray-900 dark:text-white">
                              {c.pct}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                            <div
                              className={`h-full ${c.color} rounded-full`}
                              style={{ width: `${c.pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-12 border-y border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-display font-extrabold text-[#4B2C92] dark:text-purple-400 mb-1">
                  {s.value}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {s.label}
                </div>
              </div>
            ))}
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

      {/* ── TESTIMONIALS ── */}
      <section
        id="testimonials"
        className="py-20 sm:py-28 px-4 bg-white dark:bg-gray-950"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 tracking-widest uppercase">
              Depoimentos
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-gray-900 dark:text-white mt-3">
              Quem usa, recomenda
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star
                      key={j}
                      className="w-4 h-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                  "{t.text}"
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${t.color}`}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                      {t.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {t.role}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section
        id="pricing"
        className="py-20 sm:py-28 px-4 bg-gray-50 dark:bg-gray-900/30"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 tracking-widest uppercase">
              Planos
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-gray-900 dark:text-white mt-3 mb-4">
              Simples, transparente, sem surpresas
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              14 dias grátis em todos os planos. Cancele quando quiser.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className={`rounded-2xl border p-6 flex flex-col relative ${
                  p.highlighted
                    ? "bg-[#4B2C92] border-[#4B2C92] text-white shadow-xl shadow-purple-200 dark:shadow-purple-900/40 scale-[1.02]"
                    : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700"
                }`}
              >
                {p.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-4 py-1 rounded-full">
                    Mais popular
                  </div>
                )}
                <div className="mb-6">
                  <h3
                    className={`text-lg font-display font-bold mb-1 ${p.highlighted ? "text-white" : "text-gray-900 dark:text-white"}`}
                  >
                    {p.name}
                  </h3>
                  <p
                    className={`text-sm mb-4 ${p.highlighted ? "text-purple-200" : "text-gray-500 dark:text-gray-400"}`}
                  >
                    {p.desc}
                  </p>
                  <div className="flex items-end gap-1">
                    <span
                      className={`text-3xl font-display font-extrabold ${p.highlighted ? "text-white" : "text-gray-900 dark:text-white"}`}
                    >
                      {p.price}
                    </span>
                    <span
                      className={`text-sm mb-1 ${p.highlighted ? "text-purple-200" : "text-gray-400"}`}
                    >
                      {p.period}
                    </span>
                  </div>
                </div>
                <ul className="space-y-3 flex-1 mb-6">
                  {p.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm">
                      <CheckCircle2
                        className={`w-4 h-4 shrink-0 ${p.highlighted ? "text-purple-200" : "text-green-500"}`}
                      />
                      <span
                        className={
                          p.highlighted
                            ? "text-purple-100"
                            : "text-gray-700 dark:text-gray-300"
                        }
                      >
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onGoToLogin}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] ${
                    p.highlighted
                      ? "bg-white text-[#4B2C92] hover:bg-purple-50"
                      : "bg-[#4B2C92] text-white hover:bg-[#3a1f75]"
                  }`}
                >
                  {p.cta}
                </button>
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
            Junte-se a mais de 2.000 empresas que já confiam no Trainify.
          </p>
          <button
            onClick={onGoToLogin}
            className="bg-white text-[#4B2C92] hover:bg-purple-50 font-bold px-10 py-4 rounded-xl text-base transition-all shadow-lg flex items-center gap-2 mx-auto active:scale-[0.98]"
          >
            Começar agora — é grátis <ArrowRight className="w-4 h-4" />
          </button>
          <p className="mt-4 text-purple-300 text-sm flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Configuração em menos de 5 minutos
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-950 text-gray-400 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <img src={logotipoDark} alt="Trainify" className="h-8 w-auto" />
            <div className="flex flex-wrap gap-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">
                Privacidade
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Termos
              </a>
              <a href="#" className="hover:text-white transition-colors">
                LGPD
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Contato
              </a>
            </div>
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
