import { useState, useEffect } from "react";
import { ArrowRight, Bell } from "lucide-react";
import { motion } from "motion/react";
import { Course, Activity } from "../types";
import { cn } from "../lib/utils";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../components/ui";

export default function Home() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [featuredCourses, setFeaturedCourses] = useState<Pick<Course, 'id' | 'title' | 'description' | 'thumbnail'>[]>([]);
  const [recentActivities, setRecentActivities] = useState<Pick<Activity, 'id' | 'action' | 'target' | 'time'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const { default: api } = await import("../services/api");
        
        // Fetch published courses for the feature section
        const coursesRes = await api.get("/courses");
        const coursesData = coursesRes.data.slice(0, 2).map((c: any) => ({
          id: c.id,
          title: c.title,
          description: c.description || "",
          thumbnail: c.thumbnailUrl || "",
        }));
        setFeaturedCourses(coursesData);

        // Fetch notifications as recent activity
        const notifRes = await api.get("/notifications");
        const acts = notifRes.data.slice(0, 4).map((n: any) => ({
          id: n.id,
          action: n.title,
          target: n.message,
          time: new Date(n.createdAt).toLocaleDateString(),
        }));
        setRecentActivities(acts);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    loadHomeData();
  }, []);

  if (loading) return <PageContainer><p role="status">Carregando cursos e atividades...</p></PageContainer>;
  if (error) return <PageContainer><p role="alert">Não foi possível carregar os cursos e as atividades.</p></PageContainer>;

  return (
    <PageContainer>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda */}
        <div className="lg:col-span-8 space-y-6">
          {/* Cartão de Boas-vindas */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 relative overflow-hidden flex flex-col justify-between min-h-[280px] shadow-sm">
            <div className="absolute right-0 top-0 w-64 h-64 bg-primary-fixed rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/3"></div>
            <div className="relative z-10 space-y-2">
              <h1 className="text-3xl font-display font-bold text-on-surface">
                {t("home.welcomePrefix")}{" "}
                {user?.name?.split(" ")[0] || "Usuário"}
              </h1>
              <p className="text-lg text-on-surface-variant max-w-xl">
                {t("home.subtitle")}
              </p>
            </div>

          </div>

          {/* Cursos em Destaque */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-display font-bold text-on-surface">
                {t("home.featuredCourses")}
              </h3>
              <button onClick={() => navigate("/courses")} className="text-primary hover:text-primary font-medium flex items-center gap-1 transition-colors text-sm">
                {t("home.viewAll")} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featuredCourses.length === 0 && <p>Nenhum curso disponível.</p>}
              {featuredCourses.map((course) => (
                <div
                  key={course.id}
                  className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden group hover:shadow-md transition-all duration-300 flex flex-col"
                >
                  <div className="h-40 w-full relative overflow-hidden bg-surface-container">
                    {course.thumbnail && <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />}
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-lg font-display font-bold text-on-surface mb-2 leading-tight">
                        {course.title}
                      </h4>
                      <p className="text-sm text-on-surface-variant line-clamp-2">
                        {course.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coluna Direita */}
        <div className="lg:col-span-4 space-y-6">
          {/* Registro de Atividades */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm flex flex-col h-full">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center">
              <h3 className="text-xl font-display font-bold">
                {t("home.recentActivity")}
              </h3>
            </div>
            <div className="p-6 space-y-6 flex-1">
              {recentActivities.length === 0 && <p>Nenhuma atividade recente.</p>}
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex gap-4 group cursor-pointer"
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-1 transition-colors duration-300",
                      "bg-surface-container text-on-surface-variant",
                    )}
                  >
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-on-surface">
                      {activity.action}{" "}
                      <span className="italic">{activity.target}</span>.
                    </p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-outline-variant bg-surface-bright rounded-b-2xl">
              <button onClick={() => navigate("/notifications")} className="w-full text-primary hover:text-primary font-medium text-sm py-2 transition-colors">
                {t("home.viewActivityLog")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
