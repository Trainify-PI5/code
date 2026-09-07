import { useState, useEffect } from "react";
import { ArrowRight, Clock, Trophy, Users, BadgeCheck } from "lucide-react";
import { motion } from "motion/react";
import { Course, Activity } from "../types";
import { cn } from "../lib/utils";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuthStore } from "../store/authStore";

export default function Home() {
  const { t } = useLanguage();
  const { user } = useAuthStore();

  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

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
          category: "Course",
          duration: "2h 00m",
          progress: 0,
          status: "Not Started",
          thumbnail: c.thumbnailUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=600",
        }));
        setFeaturedCourses(coursesData);

        // Fetch notifications as recent activity
        const notifRes = await api.get("/notifications");
        const acts = notifRes.data.slice(0, 4).map((n: any) => ({
          id: n.id,
          user: "Sistema",
          action: n.title,
          target: n.message,
          time: new Date(n.createdAt).toLocaleDateString(),
          type: n.type === "SYSTEM" ? "assignment" : "certification",
        }));
        setRecentActivities(acts);
      } catch (err) {
        console.error("Error loading home data", err);
      } finally {
        setLoading(false);
      }
    };
    loadHomeData();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda */}
        <div className="lg:col-span-8 space-y-6">
          {/* Cartão de Boas-vindas */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 relative overflow-hidden flex flex-col justify-between min-h-[280px] shadow-sm">
            <div className="absolute right-0 top-0 w-64 h-64 bg-primary-fixed rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/3"></div>
            <div className="relative z-10 space-y-2">
              <h2 className="text-3xl font-display font-bold text-on-surface">
                {t("home.welcomePrefix")}{" "}
                {user?.name?.split(" ")[0] || "Usuário"}
              </h2>
              <p className="text-lg text-on-surface-variant max-w-xl">
                {t("home.subtitle")}
              </p>
            </div>

            <div className="relative z-10 mt-8 bg-surface-bright border border-outline-variant rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <span className="text-xs font-bold text-primary font-display tracking-widest uppercase">
                    {t("home.currentTrack")}
                  </span>
                  <h3 className="text-xl font-display font-bold text-on-surface mt-1">
                    {t("home.trackName")}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-primary">68%</span>
                </div>
              </div>
              <div className="w-full bg-outline-variant h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary-container h-full rounded-full transition-all duration-1000"
                  style={{ width: "68%" }}
                ></div>
              </div>
              <div className="flex justify-between mt-3 text-sm text-on-surface-variant">
                <span>{t("home.moduleProgress")}</span>
                <span>{t("home.estCompletion")}</span>
              </div>
            </div>
          </div>

          {/* Cursos em Destaque */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-display font-bold text-on-surface">
                {t("home.featuredCourses")}
              </h3>
              <button className="text-primary hover:text-primary font-medium flex items-center gap-1 transition-colors text-sm">
                {t("home.viewAll")} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featuredCourses.map((course) => (
                <div
                  key={course.id}
                  className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden group hover:shadow-md transition-all duration-300 flex flex-col"
                >
                  <div className="h-40 w-full relative overflow-hidden bg-surface-container">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-secondary-container text-secondary font-bold text-[10px] uppercase tracking-wider px-2 py-1 rounded">
                      {course.id === "1"
                        ? t("home.videoSeries")
                        : t("home.interactiveQuiz")}
                    </div>
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
                    <div className="mt-4 flex items-center gap-2 text-sm text-on-surface-variant pt-4 border-t border-outline-variant">
                      <Clock className="w-4 h-4" /> {course.duration}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coluna Direita */}
        <div className="lg:col-span-4 space-y-6">
          {/* FIX 3: Métricas de equipe visíveis apenas para ADMIN e MANAGER */}
          {(user?.role === "ADMIN" || user?.role === "MANAGER") && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                  <Users className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {t("home.active")}
                  </span>
                </div>
                <div className="text-3xl font-display font-bold">3,492</div>
                <div className="text-xs text-primary font-medium mt-1 flex items-center gap-1">
                  +12%{" "}
                  <span className="text-on-surface-variant font-normal">
                    {t("home.thisMonth")}
                  </span>
                </div>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                  <BadgeCheck className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {t("home.avgScore")}
                  </span>
                </div>
                <div className="text-3xl font-display font-bold">84%</div>
                <div className="text-xs text-on-surface-variant mt-1">
                  {t("home.acrossDepts")}
                </div>
              </div>
            </div>
          )}

          {/* Registro de Atividades */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm flex flex-col h-full">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center">
              <h3 className="text-xl font-display font-bold">
                {t("home.recentActivity")}
              </h3>
            </div>
            <div className="p-6 space-y-6 flex-1">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex gap-4 group cursor-pointer"
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-1 transition-colors duration-300",
                      activity.type === "certification"
                        ? "bg-primary-fixed text-primary"
                        : activity.type === "assignment"
                          ? "bg-surface-container text-on-surface-variant"
                          : "bg-secondary-fixed text-secondary",
                    )}
                  >
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-on-surface">
                      <span className="font-bold">{activity.user}</span>{" "}
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
              <button className="w-full text-primary hover:text-primary font-medium text-sm py-2 transition-colors">
                {t("home.viewActivityLog")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
