import {
  Award,
  BookOpen,
  CheckCircle2,
  Download,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { PageContainer, useToast } from "../components/ui";
import { baixarBlob, nomeDeArquivo } from "../lib/download";
import api from "../services/api";

import { useState, useEffect } from "react";

export default function Profile() {
  const toast = useToast();
  const { user } = useAuthStore();

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
  const [baixando, setBaixando] = useState<string | null>(null);

  const baixarCertificado = async (cert: any) => {
    setBaixando(cert.id);
    try {
      const { data } = await api.get(`/certifications/${cert.id}/pdf`, {
        responseType: "blob",
      });
      baixarBlob(data, `certificado-${nomeDeArquivo(cert.title, cert.id)}.pdf`);
    } catch (err) {
      console.error("Erro ao baixar certificado", err);
      toast.error("Não foi possível baixar o certificado.");
    } finally {
      setBaixando(null);
    }
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const { default: api } = await import("../services/api");
        // Get user enrollments to find completed courses
        const enrollsRes = await api.get("/enrollments");
        const completed = enrollsRes.data.filter((e: any) => e.status === "COMPLETED").map((e: any) => ({
          id: e.id,
          title: e.course?.title || "Título indisponível",
          completedAt: e.completedAt ? new Date(e.completedAt).toLocaleDateString() : "Data indisponível",
        }));
        setCompletedCourses(completed);

        // Get user certifications
        const certsRes = await api.get("/certifications");
        setCertificates(certsRes.data.map((c: any) => ({
          id: c.id,
          title: c.courseTitle || "Certificado",
          issuedAt: c.issuedAt ? new Date(c.issuedAt).toLocaleDateString() : "Data indisponível",
        })));

      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, []);

  const stats = [
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
  ];

  if (loading) return <PageContainer><p role="status">Carregando perfil...</p></PageContainer>;
  if (error) return <PageContainer><p role="alert">Não foi possível carregar os dados do perfil.</p></PageContainer>;

  return (
    <PageContainer>
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
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 gap-4">
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
            {completedCourses.length === 0 && <p className="p-6 text-on-surface-variant">Nenhum curso concluído.</p>}
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
                      {course.completedAt}
                    </span>
                  </div>
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
                <button onClick={() => baixarCertificado(cert)} disabled={baixando === cert.id} className="shrink-0 flex items-center gap-1.5 text-xs text-primary border border-primary/30 hover:bg-primary-fixed rounded-lg px-3 py-1.5 transition-colors font-medium">
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

    </PageContainer>
  );
}
