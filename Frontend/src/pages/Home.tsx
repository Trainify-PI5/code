import { useState, useEffect } from "react";
import { ArrowRight, Bell, Loader2 } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../components/ui";
import api from "../services/api";

interface ResumoCard {
  label: string;
  value: number;
  link: string;
  suffix?: string | null;
}

interface Resumo {
  role: string;
  userName: string;
  headline: string;
  subtitle: string;
  cards: ResumoCard[];
}

interface CursoDaVitrine {
  id: string;
  title: string;
  description: string;
  status?: string;
  instructorId?: string;
}

interface Atividade {
  id: string;
  action: string;
  target: string;
  time: string;
}

const QUEM_ENSINA = ["SUPER_ADMIN", "ADMIN", "INSTRUCTOR"];

export default function Home() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [cursos, setCursos] = useState<CursoDaVitrine[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Quem produz conteúdo vê os próprios cursos, inclusive rascunhos; quem estuda
  // vê o que está publicado
  const ensina = QUEM_ENSINA.includes(user?.role || "");

  useEffect(() => {
    let cancelado = false;

    const carregar = async () => {
      try {
        const [resumoRes, cursosRes, notifRes] = await Promise.all([
          api.get<Resumo>("/home/summary"),
          api.get<any[]>(ensina ? "/courses/all" : "/courses"),
          api.get<any[]>("/notifications"),
        ]);
        if (cancelado) return;

        setResumo(resumoRes.data);

        // O instrutor vê o que ele mesmo criou; admin e supremo veem os da empresa
        const todos = cursosRes.data.map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description || "",
          status: c.status,
          instructorId: c.instructor?.id,
        }));

        const meus = user?.role === "INSTRUCTOR"
          ? todos.filter((c) => c.instructorId === user?.id)
          : todos;

        setCursos(meus.slice(0, 2));

        setAtividades(
          notifRes.data.slice(0, 4).map((n) => ({
            id: n.id,
            action: n.title,
            target: n.message,
            time: new Date(n.createdAt).toLocaleDateString(),
          }))
        );
      } catch {
        if (!cancelado) setError(true);
      } finally {
        if (!cancelado) setLoading(false);
      }
    };

    carregar();
    return () => {
      cancelado = true;
    };
  }, [ensina, user?.id, user?.role]);

  if (loading) {
    return (
      <PageContainer>
        <p role="status" className="flex items-center gap-2 text-on-surface-variant">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando sua página inicial...
        </p>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <p role="alert">Não foi possível carregar a página inicial.</p>
      </PageContainer>
    );
  }

  const primeiroNome = (resumo?.userName || user?.name || "").split(" ")[0] || "Usuário";

  const tituloDaVitrine =
    user?.role === "INSTRUCTOR"
      ? "Cursos que você criou"
      : ensina
        ? "Cursos da empresa"
        : t("home.featuredCourses");

  return (
    <PageContainer>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {/* Boas-vindas, com o texto do perfil de quem entrou */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 relative overflow-hidden shadow-sm space-y-6">
            <div className="absolute right-0 top-0 w-64 h-64 bg-primary-fixed rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/3" />

            <div className="relative z-10 space-y-2">
              <p className="text-sm font-bold uppercase tracking-widest text-primary">{resumo?.headline}</p>
              <h1 className="text-3xl font-display font-bold text-on-surface">
                {t("home.welcomePrefix")} {primeiroNome}
              </h1>
              <p className="text-lg text-on-surface-variant max-w-xl">{resumo?.subtitle}</p>
            </div>

            {/* Números que importam para este perfil */}
            <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3">
              {(resumo?.cards || []).map((card) => (
                <button
                  key={card.label}
                  onClick={() => navigate(`/${card.link}`)}
                  className="text-left bg-surface-bright border border-outline-variant rounded-xl p-4 hover:border-primary transition-colors"
                >
                  <p className="text-2xl font-display font-bold text-on-surface">
                    {card.value}
                    {card.suffix || ""}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1 leading-snug">{card.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Vitrine de cursos: "seus cursos" para quem produz, "disponíveis" para quem estuda */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-display font-bold text-on-surface">
                {tituloDaVitrine}
              </h2>
              <button
                onClick={() => navigate("/courses")}
                className="text-primary font-medium flex items-center gap-1 transition-colors text-sm"
              >
                {t("home.viewAll")} <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cursos.length === 0 && (
                <p className="text-on-surface-variant">
                  {ensina ? "Nenhum curso por aqui ainda." : "Nenhum curso disponível para você no momento."}
                </p>
              )}

              {cursos.map((curso) => (
                <button
                  key={curso.id}
                  onClick={() => navigate("/courses")}
                  className="text-left bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 hover:shadow-md hover:border-primary transition-all duration-300 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-display font-bold text-on-surface leading-tight">{curso.title}</h3>
                    {curso.status === "DRAFT" && (
                      <span className="shrink-0 bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                        Rascunho
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-on-surface-variant line-clamp-2">{curso.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm flex flex-col h-full">
            <div className="p-6 border-b border-outline-variant">
              <h2 className="text-xl font-display font-bold">{t("home.recentActivity")}</h2>
            </div>

            <div className="p-6 space-y-6 flex-1">
              {atividades.length === 0 && (
                <p className="text-on-surface-variant text-sm">Nada novo por aqui ainda.</p>
              )}

              {atividades.map((atividade) => (
                <div key={atividade.id} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-1 bg-surface-container text-on-surface-variant">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-on-surface">
                      {atividade.action} <span className="italic">{atividade.target}</span>
                    </p>
                    <p className="text-xs text-on-surface-variant mt-1">{atividade.time}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-outline-variant bg-surface-bright rounded-b-2xl">
              <button
                onClick={() => navigate("/notifications")}
                className="w-full text-primary font-medium text-sm py-2 transition-colors"
              >
                {t("home.viewActivityLog")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
