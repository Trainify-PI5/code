import { useState, useMemo, useEffect } from "react";
import { Clock, CheckCircle2, Play, BookOpenCheck } from "lucide-react";
import { Course } from "../types";
import { cn } from "../lib/utils";
import { useLanguage } from "../contexts/LanguageContext";

interface CoursesProps {
  onSelectCourse: (id: string) => void;
}

export default function Courses({ onSelectCourse }: CoursesProps) {
  const [filter, setFilter] = useState("All");
  const { t, language } = useLanguage();

  const categoriesMap: Record<string, string> = {
    All: t("courses.filterAll"),
    Leadership: t("courses.filterLeadership"),
    Technical: t("courses.filterTechnical"),
    "Soft Skills": t("courses.filterSoftSkills"),
  };

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await import("../services/api").then(m => m.default.get("/courses"));
        const data = response.data.map((c: any) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          category: "Leadership", // Default mock as backend doesn't have it
          duration: "4h 00m",
          progress: 0,
          status: "Not Started",
          thumbnail: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800"
        }));
        setCourses(data);
      } catch (error) {
        console.error("Error fetching courses", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const translatedCourses = courses.map((course) => ({
    ...course,
    categoryLabel: categoriesMap[course.category] || course.category,
  }));

  const filteredCourses =
    filter === "All"
      ? translatedCourses
      : translatedCourses.filter((c) => c.category === filter);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-outline-variant pb-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-display font-bold text-on-surface">
            {t("courses.title")}
          </h2>
          <p className="text-on-surface-variant max-w-xl">
            {t("courses.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {Object.keys(categoriesMap).map((catKey) => (
            <button
              key={catKey}
              onClick={() => setFilter(catKey)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                filter === catKey
                  ? "bg-primary-container text-white shadow-sm"
                  : "bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:border-primary",
              )}
            >
              {categoriesMap[catKey]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredCourses.map((course) => (
          <div
            key={course.id}
            className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden flex flex-col group hover:shadow-lg transition-all duration-300"
          >
            <div className="h-48 w-full relative overflow-hidden bg-surface-container">
              <img
                src={course.thumbnail}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                alt={course.title}
              />
              <div className="absolute top-4 left-4 bg-tertiary-fixed h-6 px-2 rounded flex items-center shadow-sm">
                <span className="text-[10px] font-bold text-on-tertiary-container uppercase tracking-widest">
                  {course.categoryLabel}
                </span>
              </div>
              {course.status === "Completed" && (
                <div className="absolute top-4 right-4 bg-green-100 text-green-700 px-3 py-1 rounded-full flex items-center gap-1 shadow-sm font-bold text-xs uppercase">
                  <CheckCircle2 className="w-3 h-3" />{" "}
                  {t("courses.statusCompleted")}
                </div>
              )}
            </div>

            <div className="p-7 flex flex-col flex-1">
              <h3 className="text-xl font-display font-bold text-on-surface mb-3 leading-tight group-hover:text-primary transition-colors cursor-pointer">
                {course.title}
              </h3>
              <p className="text-sm text-on-surface-variant mb-6 line-clamp-2">
                {course.description}
              </p>

              <div className="mt-auto space-y-4">
                <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> {course.duration}
                  </span>
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
                      course.status === "Completed"
                        ? "bg-green-500"
                        : "bg-primary-container",
                    )}
                    style={{ width: `${course.progress}%` }}
                  />
                </div>

                <button
                  onClick={() => onSelectCourse(course.id)}
                  className={cn(
                    "w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 active:translate-y-[1px]",
                    course.status === "Completed"
                      ? "bg-surface-container-low text-on-surface-variant hover:bg-outline-variant"
                      : course.status === "In Progress"
                        ? "bg-primary-container text-white hover:opacity-90 shadow-sm"
                        : "bg-transparent border border-primary text-primary hover:bg-primary-fixed",
                  )}
                >
                  {course.status === "Completed" ? (
                    <>
                      <BookOpenCheck className="w-4 h-4" />{" "}
                      {t("courses.reviewMaterial")}
                    </>
                  ) : course.status === "In Progress" ? (
                    <>
                      <Play className="w-4 h-4 fill-current" />{" "}
                      {t("courses.resumeCourse")}
                    </>
                  ) : (
                    t("courses.startCourse")
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
