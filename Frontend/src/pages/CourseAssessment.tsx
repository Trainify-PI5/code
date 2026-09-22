import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Trophy,
  AlertTriangle,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  text: string;
  options: Option[];
}

interface Quiz {
  id: string;
  title: string;
  passingScore: number;
  maxAttempts: number;
  attemptsUsed: number;
  attemptsRemaining: number;
  alreadyPassed: boolean;
  bestScore?: number | null;
  questions: Question[];
}

interface QuestionResult {
  questionId: string;
  text: string;
  selectedOptionId?: string | null;
  selectedOptionText?: string | null;
  correctOptionId?: string | null;
  correctOptionText?: string | null;
  correct: boolean;
}

interface Result {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  passed: boolean;
  passingScore: number;
  attemptNumber: number;
  maxAttempts: number;
  attemptsRemaining: number;
  questions: QuestionResult[];
}

interface CourseAssessmentProps {
  onBack: () => void;
}

export default function CourseAssessment({ onBack }: CourseAssessmentProps) {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { t } = useLanguage();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!lessonId) return;
    let cancelled = false;

    setLoading(true);
    api
      .get<Quiz>(`/assessments/lessons/${lessonId}`)
      .then((res) => {
        if (!cancelled) setQuiz(res.data);
      })
      .catch(() => {
        if (!cancelled) setError(t("assessment.loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lessonId, t]);

  const startAttempt = () => {
    setSelectedAnswers({});
    setCurrentStep(0);
    setResult(null);
    setStarted(true);
  };

  const handleSelect = (optionId: string) => {
    if (!quiz) return;
    const questionId = quiz.questions[currentStep].id;
    setSelectedAnswers({ ...selectedAnswers, [questionId]: optionId });
  };

  const handleNext = async () => {
    if (!quiz) return;

    if (currentStep < quiz.questions.length - 1) {
      setCurrentStep(currentStep + 1);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<Result>(`/assessments/lessons/${lessonId}/submit`, {
        answers: selectedAnswers,
      });
      setResult(res.data);
      setStarted(false);
      setQuiz({
        ...quiz,
        attemptsUsed: res.data.attemptNumber,
        attemptsRemaining: res.data.attemptsRemaining,
        alreadyPassed: res.data.passed,
        bestScore: Math.max(quiz.bestScore || 0, res.data.score),
      });
    } catch (e: any) {
      const type = e?.response?.data?.type;
      if (type === "urn:problem-type:lesson-locked") {
        setError(t("assessment.lockedError"));
      } else if (type === "urn:problem-type:assessment-attempts-exhausted") {
        setError(e.response.data.detail);
        setStarted(false);
      } else {
        setError(t("assessment.submitError"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center gap-3 text-on-surface-variant">
        <Loader2 className="w-5 h-5 animate-spin" />
        {t("assessment.loading")}
      </div>
    );
  }

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <h2 className="text-2xl font-bold">{t("assessment.notConfigured")}</h2>
        <p className="text-on-surface-variant">{t("assessment.notConfiguredDesc")}</p>
        <button onClick={onBack} className="bg-primary-container text-white px-6 py-2 rounded-lg font-bold">
          {t("assessment.back")}
        </button>
      </div>
    );
  }

  // ── Resultado, com a revisão pergunta a pergunta ──
  if (result) {
    const canRetry = !result.passed && result.attemptsRemaining > 0;

    return (
      <div className="max-w-3xl mx-auto py-8 space-y-8 animate-in fade-in duration-500">
        <div className="text-center space-y-3">
          <div
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-inner",
              result.passed ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
            )}
          >
            {result.passed ? <Trophy className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
          </div>
          <h2 className="text-3xl font-display font-bold text-on-surface">
            {result.passed ? t("assessment.approved") : t("assessment.notApproved")}
          </h2>
          <p className="text-on-surface-variant">
            {result.correctAnswers} {t("assessment.of")} {result.totalQuestions} {t("assessment.correctAnswers")} •{" "}
            {t("assessment.attempt")} {result.attemptNumber}/{result.maxAttempts}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl text-center">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
              {t("assessment.yourScore")}
            </p>
            <p className={cn("text-3xl font-display font-bold", result.passed ? "text-green-600" : "text-red-500")}>
              {result.score}%
            </p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl text-center">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
              {t("assessment.passingScore")}
            </p>
            <p className="text-3xl font-display font-bold text-on-surface">{result.passingScore}%</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-display font-bold text-on-surface">{t("assessment.review")}</h3>
          {result.questions.map((item, index) => (
            <div
              key={item.questionId}
              className={cn(
                "border rounded-2xl p-5 space-y-3",
                item.correct ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"
              )}
            >
              <div className="flex items-start gap-3">
                {item.correct ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                )}
                <p className="font-medium text-on-surface">
                  {index + 1}. {item.text}
                </p>
              </div>

              <div className="pl-8 space-y-1 text-sm">
                <p className="text-on-surface-variant">
                  {t("assessment.yourAnswer")}:{" "}
                  <span className={cn("font-medium", item.correct ? "text-green-700" : "text-red-600")}>
                    {item.selectedOptionText || t("assessment.noAnswer")}
                  </span>
                </p>
                {!item.correct && (
                  <p className="text-on-surface-variant">
                    {t("assessment.correctAnswer")}:{" "}
                    <span className="font-medium text-green-700">{item.correctOptionText}</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {!result.passed && !canRetry && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-sm">
            {t("assessment.noAttemptsLeft")}
          </div>
        )}

        <div className="flex flex-wrap gap-3 justify-center">
          {canRetry && (
            <button
              onClick={startAttempt}
              className="bg-primary-container text-white px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-sm active:scale-95 flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              {t("assessment.tryAgain")} ({result.attemptsRemaining})
            </button>
          )}
          <button
            onClick={onBack}
            className={cn(
              "px-8 py-3 rounded-xl font-bold transition-all active:scale-95",
              canRetry
                ? "border border-outline-variant text-on-surface-variant hover:bg-surface-container"
                : "bg-primary-container text-white hover:opacity-90 shadow-sm"
            )}
          >
            {t("assessment.returnToCourse")}
          </button>
        </div>
      </div>
    );
  }

  // ── Tela de início, antes de começar ──
  if (!started) {
    const blocked = quiz.alreadyPassed || quiz.attemptsRemaining <= 0;

    return (
      <div className="max-w-2xl mx-auto py-12 space-y-8 animate-in fade-in duration-500">
        <button onClick={onBack} className="flex items-center gap-2 text-on-surface-variant hover:text-primary">
          <ArrowLeft className="w-4 h-4" /> {t("assessment.back")}
        </button>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 space-y-6">
          <h2 className="text-2xl font-display font-bold text-on-surface">{quiz.title}</h2>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-display font-bold text-on-surface">{quiz.questions.length}</p>
              <p className="text-xs text-on-surface-variant uppercase tracking-widest">
                {quiz.questions.length === 1 ? t("assessment.question") : t("assessment.questions")}
              </p>
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-on-surface">{quiz.passingScore}%</p>
              <p className="text-xs text-on-surface-variant uppercase tracking-widest">
                {t("assessment.passingScore")}
              </p>
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-on-surface">
                {quiz.attemptsRemaining}/{quiz.maxAttempts}
              </p>
              <p className="text-xs text-on-surface-variant uppercase tracking-widest">
                {t("assessment.attemptsLeft")}
              </p>
            </div>
          </div>

          {quiz.alreadyPassed && (
            <div className="rounded-xl border border-green-200 bg-green-50 text-green-800 px-4 py-3 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {t("assessment.alreadyPassed")} {quiz.bestScore != null && `(${quiz.bestScore}%)`}
            </div>
          )}

          {!quiz.alreadyPassed && quiz.attemptsRemaining <= 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-sm">
              {t("assessment.noAttemptsLeft")}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
          )}

          <button
            onClick={startAttempt}
            disabled={blocked}
            className="w-full bg-primary-container text-white px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {quiz.attemptsUsed > 0 ? t("assessment.tryAgain") : t("assessment.start")}
          </button>
        </div>
      </div>
    );
  }

  // ── Respondendo ──
  const currentQuestion = quiz.questions[currentStep];
  const progress = ((currentStep + 1) / quiz.questions.length) * 100;
  const isLast = currentStep === quiz.questions.length - 1;

  return (
    <div className="max-w-3xl mx-auto py-8 animate-in fade-in duration-500 flex flex-col bg-surface-bright p-8 rounded-xl border border-outline-variant shadow-sm">
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-surface-container rounded-lg text-on-surface-variant">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-display font-bold">{quiz.title}</h2>
        </div>
        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
          {t("assessment.attempt")} {quiz.attemptsUsed + 1}/{quiz.maxAttempts}
        </span>
      </div>

      <div className="space-y-2 mb-8 shrink-0">
        <div className="flex justify-between text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
          <span>
            {t("assessment.questionOf")
              .replace("{current}", String(currentStep + 1))
              .replace("{total}", String(quiz.questions.length))}
          </span>
          <span>
            {Math.round(progress)}% {t("assessment.complete")}
          </span>
        </div>
        <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
          <div className="bg-primary-container h-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex-1 space-y-8">
        <h3 className="text-2xl font-display font-bold text-on-surface leading-tight">{currentQuestion.text}</h3>

        <div className="grid grid-cols-1 gap-4">
          {currentQuestion.options.map((option, idx) => (
            <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              className={cn(
                "w-full text-left p-6 rounded-2xl border-2 transition-all",
                selectedAnswers[currentQuestion.id] === option.id
                  ? "bg-primary-fixed border-primary shadow-md"
                  : "bg-surface-container-lowest border-outline-variant hover:border-primary"
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors",
                    selectedAnswers[currentQuestion.id] === option.id
                      ? "bg-primary-container text-white"
                      : "bg-surface-container text-on-surface-variant"
                  )}
                >
                  {String.fromCharCode(65 + idx)}
                </div>
                <span className="text-on-surface">{option.text}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

      <div className="mt-8 flex justify-end shrink-0">
        <button
          onClick={handleNext}
          disabled={!selectedAnswers[currentQuestion.id] || submitting}
          className="bg-primary-container text-white px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isLast ? t("assessment.submit") : t("assessment.next")}
        </button>
      </div>
    </div>
  );
}
