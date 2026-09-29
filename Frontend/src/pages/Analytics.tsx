import { useState, useEffect, type ReactNode } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Clock,
  Users,
  Star,
  ShieldCheck,
  Download,
  Filter,
  Search,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import { Button, Input, Modal, useToast } from "../components/ui";
import { baixarCSV } from "../lib/download";
import { useTemaGrafico } from "../lib/chartTheme";
import {
  aplicarFiltros,
  contarFiltrosAtivos,
  cursosDisponiveis,
  FILTROS_VAZIOS,
  type FiltrosAnalytics,
} from "../lib/analyticsFilters";

type EngagementPeriod = "LAST_30_DAYS" | "LAST_QUARTER" | "YEAR_TO_DATE";

interface EngagementPoint {
  periodStart: string;
  enrollments: number;
  completions: number;
}

interface StatusCount {
  status: string;
  count: number;
}

/**
 * Linha da tabela de alunos. Os campos vem crus da API (status como enum,
 * nome e e-mail separados) porque e sobre eles que os filtros trabalham — a
 * traducao e a cor sao decididas so na hora de desenhar.
 */
interface LinhaAluno {
  courseId: string;
  courseTitle: string;
  status: string;
  studentName: string;
  studentEmail: string;
  progress: number;
  score: string;
}

interface CourseCompletion {
  courseId: string;
  title: string;
  enrollments: number;
  completed: number;
  completionRate: number;
}

// Rotulo fixo por status; a cor vem do tema, que muda entre claro e escuro.
const STATUS_STYLE: Record<string, { labelKey: string }> = {
  IN_PROGRESS: { labelKey: "analytics.statusInProgress" },
  COMPLETED: { labelKey: "analytics.statusCompleted" },
  CANCELLED: { labelKey: "analytics.statusCancelled" },
};

const LOCALES: Record<string, string> = { en: "en-US", es: "es-ES", "pt-BR": "pt-BR" };

// Busca de um grafico: data fica null enquanto carrega. Respostas de uma requisicao
// anterior (ex.: troca rapida de periodo) sao descartadas para nao sobrescrever a atual.
function useAnalyticsData<T>(url: string, params?: Record<string, string>) {
  const [state, setState] = useState<{ data: T | null; error: boolean }>({ data: null, error: false });
  const paramsKey = JSON.stringify(params ?? {});

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, error: false });

    api.get(url, { params })
      .then((res) => {
        if (!cancelled) setState({ data: res.data, error: false });
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setState({ data: null, error: true });
      });

    return () => { cancelled = true; };
  }, [url, paramsKey]);

  return state;
}

function ChartMessage({ children }: { children: ReactNode }) {
  return (
    <div className="h-full min-h-[120px] w-full flex items-center justify-center text-sm text-on-surface-variant">
      {children}
    </div>
  );
}

// Espelha o enum EnrollmentStatus do backend.
const SITUACAO: Record<string, string> = {
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

export default function Analytics() {
  const [exportando, setExportando] = useState(false);
  const navigate = useNavigate();

  // `filtros` e o que esta valendo na tela; `rascunho` e o que se mexe dentro do
  // modal, para fechar no X nao aplicar o que foi digitado por engano.
  const [filtros, setFiltros] = useState<FiltrosAnalytics>(FILTROS_VAZIOS);
  const [rascunho, setRascunho] = useState<FiltrosAnalytics>(FILTROS_VAZIOS);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const filtrosAtivos = contarFiltrosAtivos(filtros);

  const abrirFiltros = () => {
    setRascunho(filtros);
    setFiltrosAbertos(true);
  };

  // GET /analytics/report devolve uma linha por matricula; o arquivo e
  // montado aqui, do mesmo jeito que na tela de Auditoria.
  const exportarRelatorio = async () => {
    setExportando(true);
    try {
      const { data } = await api.get("/analytics/report");

      if (!Array.isArray(data) || data.length === 0) {
        toast.info("Não há matrículas para exportar.");
        return;
      }

      // O arquivo sai com o mesmo recorte da tela: exportar o banco inteiro
      // depois de filtrar seria uma surpresa desagradavel.
      const linhas = aplicarFiltros(data, filtros);

      if (linhas.length === 0) {
        toast.info("Nenhuma matrícula corresponde aos filtros atuais.");
        return;
      }

      const dataBR = (valor?: string | null) =>
        valor ? new Date(valor).toLocaleDateString("pt-BR") : "";

      baixarCSV(
        `relatorio-${new Date().toISOString().slice(0, 10)}.csv`,
        [
          "Aluno",
          "E-mail",
          "Curso",
          "Situação",
          "Progresso (%)",
          "Aulas concluídas",
          "Total de aulas",
          "Melhor nota",
          "Matriculado em",
          "Concluído em",
        ],
        linhas.map((linha: any) => [
          linha.studentName,
          linha.studentEmail,
          linha.courseTitle,
          SITUACAO[linha.status] ?? linha.status,
          linha.progressPercent,
          linha.completedLessons,
          linha.totalLessons,
          linha.bestScore ?? "",
          dataBR(linha.enrolledAt),
          dataBR(linha.completedAt),
        ]),
      );

      toast.success(`${linhas.length} matrícula(s) exportada(s).`);
    } catch (err) {
      console.error("Erro ao exportar relatório", err);
      toast.error("Não foi possível exportar o relatório.");
    } finally {
      setExportando(false);
    }
  };
  const toast = useToast();
  const { t, language } = useLanguage();
  const cores = useTemaGrafico();
  const [period, setPeriod] = useState<EngagementPeriod>("LAST_30_DAYS");

  const engagement = useAnalyticsData<EngagementPoint[]>("/analytics/engagement", { period });
  const statusDistribution = useAnalyticsData<StatusCount[]>("/analytics/enrollment-status");
  const courseCompletion = useAnalyticsData<CourseCompletion[]>("/analytics/course-completion");

  const [kpis, setKpis] = useState<{
    totalUsers: number;
    totalCourses: number;
    activeEnrollments: number;
    completedEnrollments: number;
  } | null>(null);

  useEffect(() => {
    api.get('/analytics/kpis').then(res => setKpis(res.data)).catch(console.error);
  }, []);

  const stats = [
    {
      label: t("analytics.totalLearners"),
      value: kpis ? kpis.totalUsers.toString() : "—",
      icon: Users,
      bgColor: "bg-primary-fixed",
      iconColor: "text-primary",
    },
    {
      label: t("analytics.totalCourses"),
      value: kpis ? kpis.totalCourses.toString() : "—",
      icon: Star,
      bgColor: "bg-secondary-fixed",
      iconColor: "text-secondary",
    },
    {
      label: t("analytics.activeEnrollments"),
      value: kpis ? kpis.activeEnrollments.toString() : "—",
      icon: Clock,
      bgColor: "bg-surface-container",
      iconColor: "text-on-surface-variant",
    },
    {
      label: t("analytics.completedEnrollments"),
      value: kpis ? kpis.completedEnrollments.toString() : "—",
      icon: ShieldCheck,
      bgColor: "bg-green-100 dark:bg-green-500/10",
      iconColor: "text-green-700",
    },
  ];

  // Semanas aparecem como dia/mes e o ano ate hoje como mes abreviado, no idioma do app
  const formatPeriodLabel = (periodStart: string) => {
    const date = new Date(`${periodStart}T00:00:00Z`);
    const locale = LOCALES[language] || "pt-BR";
    return period === "YEAR_TO_DATE"
      ? date.toLocaleDateString(locale, { month: "short", timeZone: "UTC" })
      : date.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", timeZone: "UTC" });
  };

  const engagementChart = (engagement.data ?? []).map((point) => ({
    name: formatPeriodLabel(point.periodStart),
    enrollments: point.enrollments,
    completions: point.completions,
  }));

  const statusItems = (statusDistribution.data ?? []).map((item) => ({
    status: item.status,
    name: t(STATUS_STYLE[item.status]?.labelKey ?? item.status),
    value: item.count,
    color: cores.status[item.status] ?? cores.neutro,
  }));
  const statusTotal = statusItems.reduce((sum, item) => sum + item.value, 0);
  const statusPieData = statusItems.filter((item) => item.value > 0);

  const topCourses = (courseCompletion.data ?? [])
    .filter((curso) => !filtros.courseId || curso.courseId === filtros.courseId)
    .slice(0, 5);

  const [learners, setLearners] = useState<LinhaAluno[]>([]);

  useEffect(() => {
    api.get('/enrollments/all').then(res => {
      setLearners((res.data ?? []).map((enrollment: any) => ({
        courseId: enrollment.course?.id ?? "",
        courseTitle: enrollment.course?.title || "Curso Desconhecido",
        status: enrollment.status ?? "",
        studentName: enrollment.user?.name || "Usuário Desconhecido",
        studentEmail: enrollment.user?.email || "",
        progress: enrollment.progressPercent || 0,
        score: enrollment.score ? enrollment.score + "%" : "--",
      })));
    }).catch(console.error);
  }, []);

  const learnersFiltrados = aplicarFiltros(learners, filtros);
  const cursos = cursosDisponiveis(learners);

  // Cancelada tem rotulo proprio; as demais dependem do progresso, porque uma
  // matricula em andamento sem nenhuma aula vista ainda nao "esta em andamento".
  const situacaoDoAluno = (linha: LinhaAluno) => {
    if (linha.status === "COMPLETED") {
      return {
        rotulo: t("analytics.statusCompleted"),
        cor: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300",
      };
    }
    if (linha.status === "CANCELLED") {
      return { rotulo: t("analytics.statusCancelled"), cor: "bg-surface-container text-on-surface-variant" };
    }
    return linha.progress > 0
      ? { rotulo: t("analytics.statusInProgress"), cor: "bg-primary-fixed text-primary" }
      : { rotulo: t("analytics.statusStarted"), cor: "bg-surface-container text-on-surface-variant" };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold text-on-surface">
            {t("analytics.title")}
          </h1>
          <p className="text-on-surface-variant">{t("analytics.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <button onClick={exportarRelatorio}
            disabled={exportando} className="px-5 py-2.5 rounded-lg border border-primary text-primary font-medium hover:bg-primary-fixed transition-colors flex items-center gap-2 active:translate-y-[1px]">
            <Download className="w-4 h-4" /> {t("analytics.exportReport")}
          </button>
          <button onClick={abrirFiltros} className="px-5 py-2.5 rounded-lg bg-primary-container text-white font-medium hover:opacity-90 transition-colors flex items-center gap-2 active:translate-y-[1px] shadow-sm">
            <Filter className="w-4 h-4" /> {t("analytics.filterData")}
            {filtrosAtivos > 0 && (
              <span className="ml-1 min-w-5 px-1.5 py-0.5 rounded-full bg-white/25 text-[11px] font-bold leading-none flex items-center justify-center">
                {filtrosAtivos}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Cartões de KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6 flex flex-col justify-between hover:shadow-md transition-all duration-200"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest leading-none mt-1">
                {stat.label}
              </span>
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  stat.bgColor,
                  stat.iconColor,
                )}
              >
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-display font-bold text-on-surface">
                {stat.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl border border-outline-variant p-6 flex flex-col shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-display font-bold">
              {t("analytics.engagementOverTime")}
            </h3>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as EngagementPeriod)}
              className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:border-primary"
            >
              <option value="LAST_30_DAYS">{t("analytics.last30Days")}</option>
              <option value="LAST_QUARTER">{t("analytics.lastQuarter")}</option>
              <option value="YEAR_TO_DATE">{t("analytics.yearToDate")}</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            {engagement.error ? (
              <ChartMessage>{t("analytics.loadError")}</ChartMessage>
            ) : !engagement.data ? (
              <ChartMessage>{t("analytics.loading")}</ChartMessage>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={engagementChart}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={cores.matriculas} stopOpacity={0.1} />
                      <stop offset="95%" stopColor={cores.matriculas} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCompletions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={cores.conclusoes} stopOpacity={0.1} />
                      <stop offset="95%" stopColor={cores.conclusoes} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={cores.grade}
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: cores.eixo }}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: cores.eixo }}
                  />
                  <Tooltip
                    contentStyle={{
                      ...cores.tooltip,
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    itemStyle={{ fontWeight: 600 }}
                  />
                  <Legend verticalAlign="top" height={32} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="enrollments"
                    name={t("analytics.newEnrollments")}
                    stroke={cores.matriculas}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                  <Area
                    type="monotone"
                    dataKey="completions"
                    name={t("analytics.completions")}
                    stroke={cores.conclusoes}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorCompletions)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="text-xl font-display font-bold">
              {t("analytics.enrollmentStatus")}
            </h3>
            <p className="text-sm text-on-surface-variant">
              {t("analytics.enrollmentsByStatus")}
            </p>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            {statusDistribution.error ? (
              <ChartMessage>{t("analytics.loadError")}</ChartMessage>
            ) : !statusDistribution.data ? (
              <ChartMessage>{t("analytics.loading")}</ChartMessage>
            ) : statusTotal === 0 ? (
              <ChartMessage>{t("analytics.noEnrollments")}</ChartMessage>
            ) : (
              <>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusPieData.map((item) => (
                          <Cell key={item.status} fill={item.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          ...cores.tooltip,
                          borderRadius: "12px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full space-y-3">
                  {statusItems.map((item) => (
                    <div
                      key={item.status}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-on-surface-variant">{item.name}</span>
                      </div>
                      <span className="font-bold">{Math.round((item.value * 100) / statusTotal)}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Seção Inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6 shadow-sm flex flex-col">
          <h3 className="text-xl font-display font-bold mb-6">
            {t("analytics.courseCompletion")}
          </h3>
          <div className="space-y-5 flex-1">
            {courseCompletion.error ? (
              <ChartMessage>{t("analytics.loadError")}</ChartMessage>
            ) : !courseCompletion.data ? (
              <ChartMessage>{t("analytics.loading")}</ChartMessage>
            ) : topCourses.length === 0 ? (
              <ChartMessage>{t("analytics.noEnrollments")}</ChartMessage>
            ) : (
              topCourses.map((course) => (
                <div key={course.courseId}>
                  <div className="flex justify-between text-sm mb-2 gap-3">
                    <span className="font-medium truncate" title={course.title}>{course.title}</span>
                    <span className="text-on-surface-variant shrink-0">
                      {course.completionRate}% ({course.completed}/{course.enrollments})
                    </span>
                  </div>
                  <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary-container h-full rounded-full transition-all duration-1000"
                      style={{ width: `${course.completionRate}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden shadow-sm">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center">
            <div className="min-w-0">
              <h3 className="text-xl font-display font-bold">
                {t("analytics.learnerProgress")}
              </h3>
              {filtrosAtivos > 0 && (
                <p className="text-sm text-on-surface-variant">
                  {learnersFiltrados.length}/{learners.length} · {filtrosAtivos}{" "}
                  {t("analytics.filterActive")}
                </p>
              )}
            </div>
            <button onClick={() => navigate("/users")} className="text-primary font-medium hover:underline text-sm shrink-0">
              {t("analytics.viewAll")}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/30 border-b border-outline-variant">
                  <th className="p-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                    {t("analytics.colName")}
                  </th>
                  <th className="p-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                    {t("analytics.colCourse")}
                  </th>
                  <th className="p-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                    {t("analytics.colProgress")}
                  </th>
                  <th className="p-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                    {t("analytics.colScore")}
                  </th>
                  <th className="p-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                    {t("analytics.colStatus")}
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {learnersFiltrados.map((row, idx) => {
                  const situacao = situacaoDoAluno(row);
                  return (
                  <tr
                    key={idx}
                    className="border-b border-outline-variant hover:bg-surface-bright transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px]",
                            situacao.cor,
                          )}
                        >
                          {row.studentName.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold">{row.studentName}</span>
                      </div>
                    </td>
                    <td className="p-4 text-on-surface-variant truncate max-w-[200px]">
                      {row.courseTitle}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-surface-container h-1.5 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full",
                              row.progress === 100
                                ? "bg-green-500"
                                : "bg-primary-container",
                            )}
                            style={{ width: `${row.progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-on-surface-variant">
                          {row.progress}%
                        </span>
                      </div>
                    </td>
                    <td className="p-4 font-semibold">{row.score}</td>
                    <td className="p-4">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm",
                          situacao.cor,
                        )}
                      >
                        {situacao.rotulo}
                      </span>
                    </td>
                  </tr>
                  );
                })}
                {learners.length > 0 && learnersFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-sm text-on-surface-variant">
                      {t("analytics.noMatches")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        open={filtrosAbertos}
        onClose={() => setFiltrosAbertos(false)}
        title={t("analytics.filtersTitle")}
        description={t("analytics.filtersDescription")}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setRascunho(FILTROS_VAZIOS)}
              disabled={contarFiltrosAtivos(rascunho) === 0}
            >
              {t("analytics.filterClear")}
            </Button>
            <Button
              onClick={() => {
                setFiltros(rascunho);
                setFiltrosAbertos(false);
              }}
            >
              {t("analytics.filterApply")}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="filtro-curso"
              className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest"
            >
              {t("analytics.filterCourse")}
            </label>
            <select
              id="filtro-curso"
              value={rascunho.courseId}
              onChange={(e) => setRascunho({ ...rascunho, courseId: e.target.value })}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-surface outline-none transition-all focus:border-primary"
            >
              <option value="">{t("analytics.filterAll")}</option>
              {cursos.map((curso) => (
                <option key={curso.id} value={curso.id}>
                  {curso.titulo}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="filtro-situacao"
              className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest"
            >
              {t("analytics.filterStatus")}
            </label>
            <select
              id="filtro-situacao"
              value={rascunho.status}
              onChange={(e) => setRascunho({ ...rascunho, status: e.target.value })}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-surface outline-none transition-all focus:border-primary"
            >
              <option value="">{t("analytics.filterAll")}</option>
              {Object.entries(STATUS_STYLE).map(([status, estilo]) => (
                <option key={status} value={status}>
                  {t(estilo.labelKey)}
                </option>
              ))}
            </select>
          </div>

          <Input
            label={t("analytics.filterSearch")}
            placeholder={t("analytics.filterSearchPlaceholder")}
            icon={<Search className="w-4 h-4" />}
            value={rascunho.busca}
            onChange={(e) => setRascunho({ ...rascunho, busca: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
