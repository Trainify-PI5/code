import { useState, useMemo } from "react";
import {
  Play,
  FileText,
  CheckCircle,
  ChevronRight,
  Lock,
  Clock,
  ArrowLeft,
  Trophy,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useLanguage } from "../contexts/LanguageContext";

interface Lesson {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  locked: boolean;
  type: "video" | "quiz" | "text";
}

interface CourseContentProps {
  onBack: () => void;
  onAssessment: () => void;
}

export default function CourseContent({
  onBack,
  onAssessment,
}: CourseContentProps) {
  const { t, language } = useLanguage();

  const lessons: Lesson[] = useMemo(
    () => [
      {
        id: "1",
        title: t("content.lesson1"),
        duration: "15:20",
        completed: true,
        locked: false,
        type: "video",
      },
      {
        id: "2",
        title: t("content.lesson2"),
        duration: "12:45",
        completed: true,
        locked: false,
        type: "video",
      },
      {
        id: "3",
        title: t("content.lesson3"),
        duration: "20:00",
        completed: false,
        locked: false,
        type: "video",
      },
      {
        id: "4",
        title: t("content.lesson4"),
        duration: t("content.lesson4Duration"),
        completed: false,
        locked: false,
        type: "quiz",
      },
      {
        id: "5",
        title: t("content.lesson5"),
        duration: "25:00",
        completed: false,
        locked: true,
        type: "video",
      },
      {
        id: "6",
        title: t("content.lesson6"),
        duration: t("content.lesson6Duration"),
        completed: false,
        locked: true,
        type: "text",
      },
    ],
    [language],
  );

  const [activeLesson, setActiveLesson] = useState(lessons[2]);

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between py-4 border-b border-outline-variant mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant hover:text-primary"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-display font-bold text-on-surface">
              {t("content.courseTitle")}
            </h1>
            <p className="text-xs text-on-surface-variant font-medium">
              {t("content.moduleInfo")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              {t("content.courseGrade")}
            </span>
            <span className="text-sm font-bold text-primary">
              {t("content.gradeValue")}
            </span>
          </div>
          <button
            onClick={onAssessment}
            className="bg-primary-container text-white px-5 py-2 rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center gap-2 active:scale-95 shadow-sm"
          >
            <Trophy className="w-4 h-4" /> {t("content.retakeAssessment")}
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-8 overflow-hidden">
        {/* Conteúdo Principal */}
        <div className="flex-1 flex flex-col space-y-6 overflow-y-auto pr-4">
          {/* Vídeo */}
          <div className="aspect-video bg-inverse-surface rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group shadow-2xl">
            <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-10 transition-opacity" />
            <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform active:scale-95">
              <Play className="w-10 h-10 text-white fill-current translate-x-1" />
            </div>
            <div className="absolute bottom-6 left-6 right-6">
              <div className="flex justify-between text-white text-[10px] font-bold uppercase tracking-widest mb-2 opacity-60">
                <span>08:45 / {activeLesson.duration}</span>
                <span>{t("content.frameworkEvolution")}</span>
              </div>
              <div className="w-full bg-white/20 h-1 rounded-full">
                <div className="bg-primary-fixed h-full w-[45%]" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <h2 className="text-2xl font-display font-bold text-on-surface">
                {activeLesson.title}
              </h2>
              <button className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline uppercase tracking-widest">
                <FileText className="w-4 h-4" />{" "}
                {t("content.downloadTranscript")}
              </button>
            </div>
            <div className="text-on-surface-variant/90 leading-relaxed space-y-3">
              <p>{t("content.lessonDesc1")}</p>
              <p>{t("content.lessonDesc2")}</p>
              <ul className="space-y-2 mt-4 list-disc pl-5">
                <li>{t("content.bullet1")}</li>
                <li>{t("content.bullet2")}</li>
                <li>{t("content.bullet3")}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Barra Lateral */}
        <aside className="w-80 bg-surface-container-lowest border border-outline-variant rounded-2xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-5 border-b border-outline-variant">
            <h3 className="font-display font-bold text-on-surface">
              {t("content.lessonPlan")}
            </h3>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1">
              {t("content.lessonPlanInfo")}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {lessons.map((lesson) => (
              <button
                key={lesson.id}
                disabled={lesson.locked}
                onClick={() => setActiveLesson(lesson)}
                className={cn(
                  "w-full flex items-center gap-4 px-5 py-4 border-b border-outline-variant/30 text-left transition-all",
                  activeLesson.id === lesson.id
                    ? "bg-primary-fixed/30 border-l-4 border-l-primary-container"
                    : "hover:bg-surface-container/50",
                  lesson.locked && "opacity-50 cursor-not-allowed",
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                    lesson.completed
                      ? "bg-green-50 border-green-100 text-green-600"
                      : activeLesson.id === lesson.id
                        ? "bg-primary-container text-white"
                        : "bg-surface-container-lowest border-outline-variant text-on-surface-variant",
                  )}
                >
                  {lesson.completed ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : lesson.locked ? (
                    <Lock className="w-3 h-3" />
                  ) : lesson.type === "video" ? (
                    <Play className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-xs font-bold truncate",
                      activeLesson.id === lesson.id
                        ? "text-on-surface"
                        : "text-on-surface-variant",
                    )}
                  >
                    {lesson.title}
                  </p>
                  <p className="text-[10px] font-medium text-on-surface-variant mt-0.5 flex items-center gap-1 uppercase tracking-widest opacity-60 font-sans">
                    <Clock className="w-2.5 h-2.5" /> {lesson.duration}
                  </p>
                </div>
                <ChevronRight
                  className={cn(
                    "w-4 h-4 text-outline-variant transition-transform",
                    activeLesson.id === lesson.id &&
                      "translate-x-1 text-primary",
                  )}
                />
              </button>
            ))}
          </div>
          <div className="p-4 bg-surface-container-low/50">
            <button className="w-full bg-surface-container-lowest border border-outline-variant py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest hover:border-primary transition-all">
              {t("content.markComplete")}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
