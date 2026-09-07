import {
  Award,
  BookOpen,
  Clock,
  TrendingUp,
  Star,
  CheckCircle2,
  Download,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useLanguage } from "../contexts/LanguageContext";

import { useState, useEffect } from "react";

export default function Profile() {
  const { user } = useAuthStore();
  const { t } = useLanguage();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  const [completedCourses, setCompletedCourses] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const { default: api } = await import("../services/api");
        // Get user enrollments to find completed courses
        const enrollsRes = await api.get("/enrollments");
        const completed = enrollsRes.data.filter((e: any) => e.status === "COMPLETED").map((e: any) => ({
          id: e.id,
          title: e.courseTitle || "Curso sem Título",
          category: "Liderança",
          duration: "4h 00m",
          completedAt: new Date(e.lastAccessedAt || Date.now()).toLocaleDateString(),
          score: e.score || 100,
        }));
        setCompletedCourses(completed);

        // Get user certifications
        const certsRes = await api.get("/certifications");
        setCertificates(certsRes.data.map((c: any) => ({
          id: c.id,
          title: c.courseTitle || "Certificado",
          issuedAt: new Date(c.issuedAt).toLocaleDateString(),
        })));

      } catch (err) {
        console.error("Error loading profile data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, []);

  const stats = [
    {
      label: "Horas Estudadas",
      value: `${completedCourses.length * 4}h`,
      icon: Clock,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "Cursos Concluídos",
      value: completedCourses.length.toString(),
      icon: BookOpen,
      color: "text-green-500",
      bg: "bg-green-50 dark:bg-green-950/30",
    },
    {
      label: "Certificados",
      value: certificates.length.toString(),
      icon: Award,
      color: "text-yellow-500",
      bg: "bg-yellow-50 dark:bg-yellow-950/30",
    },
    {
      label: "Nota Média",
      value: completedCourses.length > 0 
        ? `${Math.round(completedCourses.reduce((acc, c) => acc + c.score, 0) / completedCourses.length)}%` 
        : "0%",
      icon: TrendingUp,
      color: "text-purple-500",
      bg: "bg-purple-50 dark:bg-purple-950/30",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header do Perfil */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative group shrink-0">
            <div className="w-24 h-24 rounded-full bg-primary-container flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <label
              htmlFor="avatar-upload"
              className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            >
              <span className="text-white text-xs font-bold text-center leading-tight px-2">
                Alterar foto
              </span>
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const result = ev.target?.result as string;
                    //salvar no authStore quando tiver o backend
                    console.log("Nova foto:", result);
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
          </div>
          <div className="flex-1 text-center sm:text-left space-y-2">
            <h1 className="text-3xl font-display font-bold text-on-surface">
              {user?.name || "—"}
            </h1>
            <p className="text-on-surface-variant">{user?.email || "—"}</p>
            <span className="inline-block bg-primary-fixed text-primary text-xs font-bold px-3 py-1 rounded-full">
              {user?.role || "—"}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-950/30 px-4 py-2 rounded-xl">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            <span className="font-bold text-yellow-600 dark:text-yellow-400">
              Top Aluno
            </span>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm flex flex-col items-center gap-3 text-center"
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}
            >
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <div className="text-2xl font-display font-bold text-on-surface">
                {stat.value}
              </div>
              <div className="text-xs text-on-surface-variant mt-0.5">
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cursos Concluídos */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm">
          <div className="p-6 border-b border-outline-variant">
            <h2 className="text-xl font-display font-bold text-on-surface flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Cursos Concluídos
            </h2>
          </div>
          <div className="divide-y divide-outline-variant">
            {completedCourses.map((course) => (
              <div
                key={course.id}
                className="p-5 flex items-center gap-4 hover:bg-surface-container transition-colors"
              >
                <div className="w-10 h-10 bg-green-50 dark:bg-green-950/30 rounded-xl flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-on-surface truncate">
                    {course.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-on-surface-variant">
                      {course.category}
                    </span>
                    <span className="text-xs text-on-surface-variant">•</span>
                    <span className="text-xs text-on-surface-variant">
                      {course.duration}
                    </span>
                    <span className="text-xs text-on-surface-variant">•</span>
                    <span className="text-xs text-on-surface-variant">
                      {course.completedAt}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {course.score}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Certificados */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm">
          <div className="p-6 border-b border-outline-variant">
            <h2 className="text-xl font-display font-bold text-on-surface flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Certificados
            </h2>
          </div>
          <div className="divide-y divide-outline-variant">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="p-5 flex items-center gap-4 hover:bg-surface-container transition-colors"
              >
                <div className="w-10 h-10 bg-yellow-50 dark:bg-yellow-950/30 rounded-xl flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5 text-yellow-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-on-surface truncate">
                    {cert.title}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Emitido em {cert.issuedAt}
                  </p>
                </div>
                <button className="shrink-0 flex items-center gap-1.5 text-xs text-primary border border-primary/30 hover:bg-primary-fixed rounded-lg px-3 py-1.5 transition-colors font-medium">
                  <Download className="w-3.5 h-3.5" />
                  Baixar
                </button>
              </div>
            ))}
          </div>

          {certificates.length === 0 && (
            <div className="p-8 text-center text-on-surface-variant text-sm">
              Nenhum certificado conquistado ainda.
            </div>
          )}
        </div>
      </div>

      {/* Progresso Geral */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-display font-bold text-on-surface mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Progresso por Categoria
        </h2>
        <div className="space-y-5">
          {[
            { label: "Liderança", value: 75, color: "bg-purple-500" },
            { label: "Técnico", value: 60, color: "bg-blue-500" },
            { label: "Soft Skills", value: 90, color: "bg-green-500" },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-on-surface">
                  {item.label}
                </span>
                <span className="text-sm font-bold text-on-surface">
                  {item.value}%
                </span>
              </div>
              <div className="w-full bg-outline-variant h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${item.color}`}
                  style={{ width: `${item.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
