import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Star,
  ShieldCheck,
  Download,
  Filter,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useLanguage } from "../contexts/LanguageContext";

const COLORS = ["#4b2c92", "#6b5584", "#b3aac0", "#edeeef"];

export default function Analytics() {
  const { t } = useLanguage();

  const engagementData = [
    { name: t("analytics.week1"), value: 4000 },
    { name: t("analytics.week2"), value: 3000 },
    { name: t("analytics.week3"), value: 6000 },
    { name: t("analytics.week4"), value: 5000 },
    { name: t("analytics.week5"), value: 8000 },
    { name: t("analytics.week6"), value: 7500 },
  ];

  const distributionData = [
    { name: t("analytics.leadership"), value: 45 },
    { name: t("analytics.technical"), value: 30 },
    { name: t("analytics.compliance"), value: 15 },
    { name: t("analytics.softSkills"), value: 10 },
  ];

  const [kpis, setKpis] = useState<{
    totalUsers: number;
    totalCourses: number;
    activeEnrollments: number;
    completedEnrollments: number;
  } | null>(null);

  useEffect(() => {
    import("../services/api").then(api => {
      api.default.get('/analytics/kpis').then(res => setKpis(res.data)).catch(console.error);
    });
  }, []);

  const stats = [
    {
      label: t("analytics.totalLearners"),
      value: kpis ? kpis.totalUsers.toString() : "12,450",
      change: "+14.5%",
      isPositive: true,
      icon: Users,
      bgColor: "bg-primary-fixed",
      iconColor: "text-primary",
    },
    {
      label: "Total Cursos", // fallback
      value: kpis ? kpis.totalCourses.toString() : "84.2%",
      change: "+2.1%",
      isPositive: true,
      icon: Star,
      bgColor: "bg-secondary-fixed",
      iconColor: "text-secondary",
    },
    {
      label: "Matrículas Ativas", // fallback
      value: kpis ? kpis.activeEnrollments.toString() : "14h 30m",
      change: "-1.5h",
      isPositive: false,
      icon: Clock,
      bgColor: "bg-surface-container",
      iconColor: "text-on-surface-variant",
    },
    {
      label: "Matrículas Concluídas", // fallback
      value: kpis ? kpis.completedEnrollments.toString() : "68%",
      change: "+5.4%",
      isPositive: true,
      icon: ShieldCheck,
      bgColor: "bg-green-100",
      iconColor: "text-green-700",
    },
  ];

  const departments = [
    { dept: t("analytics.deptEngineering"), value: 92 },
    { dept: t("analytics.deptSales"), value: 85 },
    { dept: t("analytics.deptMarketing"), value: 78 },
    { dept: t("analytics.deptHR"), value: 95 },
  ];

  const [learners, setLearners] = useState<any[]>([]);

  useEffect(() => {
    import("../services/api").then(api => {
      api.default.get('/analytics/kpis').then(res => setKpis(res.data)).catch(console.error);
      
      api.default.get('/enrollments/all').then(res => {
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
    });
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
              <div
                className={cn(
                  "flex items-center gap-1 mt-2 text-xs font-semibold",
                  stat.isPositive ? "text-green-600" : "text-red-500",
                )}
              >
                {stat.isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {stat.change}
                <span className="text-on-surface-variant font-normal ml-1">
                  {t("analytics.vsLastMonth")}
                </span>
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
            <select className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:border-primary">
              <option>{t("analytics.last30Days")}</option>
              <option>{t("analytics.lastQuarter")}</option>
              <option>{t("analytics.yearToDate")}</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={engagementData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4b2c92" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#4b2c92" stopOpacity={0} />
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
                  itemStyle={{ color: "#4b2c92", fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#4b2c92"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="text-xl font-display font-bold">
              {t("analytics.courseDistribution")}
            </h3>
            <p className="text-sm text-on-surface-variant">
              {t("analytics.enrollmentsByCategory")}
            </p>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {distributionData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
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
              {distributionData.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[idx] }}
                    />
                    <span className="text-on-surface-variant">{item.name}</span>
                  </div>
                  <span className="font-bold">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Seção Inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6 shadow-sm flex flex-col">
          <h3 className="text-xl font-display font-bold mb-6">
            {t("analytics.deptPerformance")}
          </h3>
          <div className="space-y-5 flex-1">
            {departments.map((d, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">{d.dept}</span>
                  <span className="text-on-surface-variant">{d.value}%</span>
                </div>
                <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary-container h-full rounded-full transition-all duration-1000"
                    style={{ width: `${d.value}%` }}
                  />
                </div>
              </div>
            ))}
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
