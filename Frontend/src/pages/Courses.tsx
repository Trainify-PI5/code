import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, CheckCircle2, Play, BookOpenCheck, Pencil, FileText, Loader2, BarChart3 } from "lucide-react";
import { cn } from "../lib/utils";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuthStore } from "../store/authStore";
import api from "../services/api";

type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

interface ApiLesson {
  id: string;
  durationSeconds?: number | null;
}

interface ApiModule {
  id: string;
  lessons?: ApiLesson[] | null;
}

interface ApiCourse {
  id: string;
  title: string;
  description: string;
  status: CourseStatus;
  instructor?: { id: string; name?: string } | null;
  modules?: ApiModule[] | null;
}

interface ApiEnrollment {
  id: string;
  course?: { id: string } | null;
  status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  progressPercent?: number;
  totalLessons?: number;
  completedLessons?: number;
}

interface CourseCard {
  id: string;
  title: string;
  description: string;
  courseStatus: CourseStatus;
  lessons: number;
  durationLabel: string;
  progress: number;
  enrolled: boolean;
  completed: boolean;
}

const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "INSTRUCTOR"];
const EDITOR_ROLES = ["SUPER_ADMIN", "ADMIN", "INSTRUCTOR"];

function countLessons(course: ApiCourse) {
  return (course.modules || []).reduce((total, m) => total + (m.lessons?.length || 0), 0);
}

function durationLabel(course: ApiCourse) {
  const seconds = (course.modules || [])
    .flatMap((m) => m.lessons || [])
    .reduce((total, lesson) => total + (lesson.durationSeconds || 0), 0);

  if (!seconds) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes.toString().padStart(2, "0")}m` : `${minutes} min`;
}

export default function Courses() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isStaff = STAFF_ROLES.includes(user?.role || "");
  const canEdit = EDITOR_ROLES.includes(user?.role || "");

  const [courses, setCourses] = useState<CourseCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Quem administra ou ensina precisa enxergar tambem os rascunhos
        const [courseResponse, enrollmentResponse] = await Promise.all([
          api.get<ApiCourse[]>(isStaff ? "/courses/all" : "/courses"),
          isStaff ? Promise.resolve(null) : api.get<ApiEnrollment[]>("/enrollments"),
        ]);
        if (cancelled) return;

        const byCourse = new Map<string, ApiEnrollment>();
        (enrollmentResponse?.data || []).forEach((enrollment) => {
          if (enrollment.course?.id) byCourse.set(enrollment.course.id, enrollment);
        });

        setCourses(
          courseResponse.data.map((course) => {
            const enrollment = byCourse.get(course.id);
            const duration = durationLabel(course);
            return {
              id: course.id,
              title: course.title,
              description: course.description,
              courseStatus: course.status,
              lessons: countLessons(course),
              durationLabel: duration || "",
              progress: enrollment?.progressPercent || 0,
              enrolled: Boolean(enrollment),
              completed: enrollment?.status === "COMPLETED",
            };
          })
        );
      } catch {
        if (!cancelled) setError(t("courses.loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isStaff, t]);

  const filters = isStaff
    ? [
        { key: "all", label: t("courses.filterAll") },
        { key: "published", label: t("courses.filterPublished") },
        { key: "draft", label: t("courses.filterDraft") },
      ]
    : [
        { key: "all", label: t("courses.filterAll") },
        { key: "inProgress", label: t("courses.filterInProgress") },
        { key: "completed", label: t("courses.filterCompleted") },
        { key: "notStarted", label: t("courses.filterNotStarted") },
      ];

  const visibleCourses = courses.filter((course) => {
    switch (filter) {
      case "published":
        return course.courseStatus === "PUBLISHED";
      case "draft":
        return course.courseStatus === "DRAFT";
      case "completed":
        return course.completed;
      case "inProgress":
        return course.enrolled && !course.completed;
      case "notStarted":
        return !course.enrolled;
      default:
        return true;
    }
  });

  const openCourse = async (course: CourseCard) => {
    if (isStaff) {
      navigate(canEdit ? `/courses/builder/${course.id}` : `/courses/${course.id}`);
      return;
    }

    // O aluno entra no curso na primeira vez que abre
    if (!course.enrolled) {
      try {
        setEnrolling(course.id);
        await api.post(`/courses/${course.id}/enroll`);
      } catch {
        setError(t("courses.enrollError"));
        setEnrolling(null);
        return;
      }
      setEnrolling(null);
    }
    navigate(`/courses/${course.id}/learn`);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-outline-variant pb-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-display font-bold text-on-surface">{t("courses.title")}</h2>
          <p className="text-on-surface-variant max-w-xl">{t("courses.subtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {filters.map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                filter === item.key
                  ? "bg-primary-container text-white shadow-sm"
                  : "bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:border-primary"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-on-surface-variant">
          <Loader2 className="w-5 h-5 animate-spin" />
          {t("courses.loading")}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

      {!loading && !error && visibleCourses.length === 0 && (
        <div className="rounded-2xl border border-dashed border-outline-variant p-10 text-center text-on-surface-variant">
          {isStaff ? t("courses.emptyStaff") : t("courses.emptyStudent")}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {visibleCourses.map((course) => (
          <div
            key={course.id}
            className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden flex flex-col group hover:shadow-lg transition-all duration-300"
          >
            <div className="h-32 w-full relative bg-primary-fixed flex items-center justify-center">
              <BookOpenCheck className="w-10 h-10 text-primary opacity-70" />
              {course.courseStatus === "DRAFT" && (
                <div className="absolute top-4 left-4 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  {t("courses.badgeDraft")}
                </div>
              )}
              {course.completed && (
                <div className="absolute top-4 right-4 bg-green-100 text-green-700 px-3 py-1 rounded-full flex items-center gap-1 shadow-sm font-bold text-xs uppercase">
                  <CheckCircle2 className="w-3 h-3" /> {t("courses.statusCompleted")}
                </div>
              )}
            </div>

            <div className="p-7 flex flex-col flex-1">
              <h3 className="text-xl font-display font-bold text-on-surface mb-3 leading-tight">{course.title}</h3>
              <p className="text-sm text-on-surface-variant mb-6 line-clamp-2">{course.description}</p>

              <div className="mt-auto space-y-4">
                <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    {course.lessons} {course.lessons === 1 ? t("courses.lesson") : t("courses.lessons")}
                  </span>
                  {course.durationLabel && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" /> {course.durationLabel}
                    </span>
                  )}
                </div>

                {!isStaff && (
                  <>
                    <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium">
                      <span>
                        {course.progress > 0
                          ? `${course.progress}% ${t("courses.statusComplete")}`
                          : t("courses.statusNotStarted")}
                      </span>
                    </div>
                    <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          course.completed ? "bg-green-500" : "bg-primary-container"
                        )}
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </>
                )}

                <button
                  onClick={() => openCourse(course)}
                  disabled={enrolling === course.id}
                  className={cn(
                    "w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 active:translate-y-[1px] disabled:opacity-60",
                    course.completed
                      ? "bg-surface-container-low text-on-surface-variant hover:bg-outline-variant"
                      : course.enrolled || isStaff
                        ? "bg-primary-container text-white hover:opacity-90 shadow-sm"
                        : "bg-transparent border border-primary text-primary hover:bg-primary-fixed"
                  )}
                >
                  {enrolling === course.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isStaff ? (
                    <>
                      {canEdit ? <Pencil className="w-4 h-4" /> : <BookOpenCheck className="w-4 h-4" />}
                      {canEdit ? t("courses.editCourse") : t("courses.viewCourse")}
                    </>
                  ) : course.completed ? (
                    <>
                      <BookOpenCheck className="w-4 h-4" /> {t("courses.reviewMaterial")}
                    </>
                  ) : course.enrolled ? (
                    <>
                      <Play className="w-4 h-4 fill-current" /> {t("courses.resumeCourse")}
                    </>
                  ) : (
                    t("courses.startCourse")
                  )}
                </button>

                {isStaff && (
                  <button
                    onClick={() => navigate(`/courses/${course.id}/results`)}
                    className="w-full py-2 px-4 rounded-xl text-sm font-medium border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
                  >
                    <BarChart3 className="w-4 h-4" /> {t("courses.seeResults")}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
