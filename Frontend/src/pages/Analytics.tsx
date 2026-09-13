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
} from "lucide-react";
import { cn } from "../lib/utils";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

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

interface CourseCompletion {
  courseId: string;
  title: string;
  enrollments: number;
  completed: number;
  completionRate: number;
}

// Cor fixa por status, para a pizza e a legenda nao trocarem de cor entre cargas
const STATUS_STYLE: Record<string, { labelKey: string; color: string }> = {
  IN_PROGRESS: { labelKey: "analytics.statusInProgress", color: "#4b2c92" },
  COMPLETED: { labelKey: "analytics.statusCompleted", color: "#16a34a" },
  CANCELLED: { labelKey: "analytics.statusCancelled", color: "#b3aac0" },
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

export default function Analytics() {
  const { t, language } = useLanguage();
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
      bgColor: "bg-green-100",
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
    color: STATUS_STYLE[item.status]?.color ?? "#edeeef",
  }));
  const statusTotal = statusItems.reduce((sum, item) => sum + item.value, 0);
  const statusPieData = statusItems.filter((item) => item.value > 0);

  const topCourses = (courseCompletion.data ?? []).slice(0, 5);

  const [learners, setLearners] = useState<any[]>([]);

  useEffect(() => {
    api.get('/enrollments/all').then(res => {
         const fetchedLearners = res.data.map((enrollment: any) => {
             const prog = enrollment.progressPercentage || 0;
             return {
                 name: enrollment.user?.name || "Usuário Desconhecido",
                 initial: (enrollment.user?.name || "U").substring(0,2).toUpperCase(),
                 course: enrollment.course?.title || "Curso Desconhecido",
                 progress: prog,
                 score: enrollment.score ? enrollment.score + "%" : "--",
                 status: enrollment.status === 'COMPLETED' ? t("analytics.statusCompleted") : (prog > 0 ? t("analytics.statusInProgress") : t("analytics.statusStarted")),
                 color: enrollment.status === 'COMPLETED' ? "bg-green-100 text-green-700" : (prog > 0 ? "bg-primary-fixed text-primary" : "bg-surface-container text-on-surface-variant"),
             };
         });
         setLearners(fetchedLearners);
    }).catch(console.error);
  }, [t]);

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
          <button className="px-5 py-2.5 rounded-lg border border-primary text-primary font-medium hover:bg-primary-fixed transition-colors flex items-center gap-2 active:translate-y-[1px]">
            <Download className="w-4 h-4" /> {t("analytics.exportReport")}
          </button>
          <button className="px-5 py-2.5 rounded-lg bg-primary-container text-white font-medium hover:opacity-90 transition-colors flex items-center gap-2 active:translate-y-[1px] shadow-sm">
            <Filter className="w-4 h-4" /> {t("analytics.filterData")}
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
                      <stop offset="5%" stopColor="#4b2c92" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#4b2c92" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCompletions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#edeeef"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#494552" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#494552" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      borderRadius: "12px",
                      borderColor: "#cbc4d3",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    itemStyle={{ fontWeight: 600 }}
                  />
                  <Legend verticalAlign="top" height={32} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="enrollments"
                    name={t("analytics.newEnrollments")}
                    stroke="#4b2c92"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                  <Area
                    type="monotone"
                    dataKey="completions"
                    name={t("analytics.completions")}
                    stroke="#16a34a"
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
                          borderRadius: "12px",
                          border: "none",
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
            <h3 className="text-xl font-display font-bold">
              {t("analytics.learnerProgress")}
            </h3>
            <button className="text-primary font-medium hover:underline text-sm">
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
                {learners.map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-outline-variant hover:bg-surface-bright transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px]",
                            row.color,
                          )}
                        >
                          {row.initial}
                        </div>
                        <span className="font-semibold">{row.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-on-surface-variant truncate max-w-[200px]">
                      {row.course}
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
                          row.status === t("analytics.statusCompleted")
                            ? "bg-green-100 text-green-700"
                            : row.status === t("analytics.statusInProgress")
                              ? "bg-primary-fixed text-primary"
                              : "bg-surface-container text-on-surface-variant",
                        )}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
