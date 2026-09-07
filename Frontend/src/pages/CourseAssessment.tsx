import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  Info,
  CheckCircle2,
  ChevronRight,
  Trophy,
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

interface CourseAssessmentProps {
  onBack: () => void;
}

export default function CourseAssessment({ onBack }: CourseAssessmentProps) {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quizData, setQuizData] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (lessonId) {
      api.get(`/assessments/lessons/${lessonId}`)
        .then(res => {
          setQuizData(res.data);
        })
        .catch(err => {
          console.error(err);
          alert("Não foi possível carregar a avaliação.");
        })
        .finally(() => setLoading(false));
    }
  }, [lessonId]);

  const handleSelect = (optionId: string) => {
    if (!quizData) return;
    const currentQId = quizData.questions[currentStep].id;
    setSelectedAnswers({ ...selectedAnswers, [currentQId]: optionId });
  };

  const handleNext = async () => {
    if (!quizData) return;
    if (currentStep < quizData.questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setSubmitting(true);
      try {
        const res = await api.post(`/assessments/lessons/${lessonId}/submit`, {
          answers: selectedAnswers
        });
        setResult(res.data);
        setIsFinished(true);
      } catch (e) {
        alert("Erro ao enviar avaliação.");
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (loading) return <div className="p-8 text-center text-on-surface-variant">Carregando avaliação...</div>;
  if (!quizData || !quizData.questions || quizData.questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <h2 className="text-2xl font-bold">Avaliação não configurada</h2>
        <p className="text-on-surface-variant">Esta aula não possui perguntas cadastradas.</p>
        <button onClick={onBack} className="bg-primary text-white px-6 py-2 rounded-lg font-bold">
           Voltar
        </button>
      </div>
    );
  }

  if (isFinished && result) {
    return (
      <div className="max-w-2xl mx-auto h-[80vh] flex flex-col items-center justify-center animate-in zoom-in duration-500 text-center">
        <div className={`w-24 h-24 ${result.passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} rounded-full flex items-center justify-center mb-8 shadow-inner`}>
          <Trophy className="w-12 h-12" />
        </div>
        <h2 className="text-4xl font-display font-bold text-on-surface mb-2">
          {result.passed ? t("assessment.completed") : "Avaliação Concluída"}
        </h2>
        <p className="text-on-surface-variant text-lg mb-10 max-w-md">
          {result.passed ? t("assessment.completedDesc") : "Você não atingiu a nota mínima. Tente novamente!"}
        </p>

        <div className="grid grid-cols-2 gap-4 w-full mb-8">
          <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
              Nota Obtida
            </p>
            <p className={`text-3xl font-display font-bold ${result.passed ? 'text-primary' : 'text-red-500'}`}>
              {result.score}%
            </p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
              Nota de Corte
            </p>
            <p className="text-3xl font-display font-bold text-on-surface">
              {result.passingScore}%
            </p>
          </div>
        </div>

        <button
          onClick={onBack}
          className="bg-primary-container text-white px-8 py-3 rounded-xl font-bold text-lg hover:opacity-90 transition-all shadow-md active:scale-95"
        >
          {t("assessment.returnToCourse")}
        </button>
      </div>
    );
  }

  const currentQuestion = quizData.questions[currentStep];
  const progress = ((currentStep + 1) / quizData.questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto py-8 animate-in fade-in duration-500 h-[calc(100vh-6rem)] flex flex-col bg-surface-bright p-8 rounded-xl border border-outline-variant shadow-sm">
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-surface-container rounded-lg text-on-surface-variant"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-display font-bold">
            {quizData.title}
          </h2>
        </div>
      </div>

      <div className="space-y-2 mb-8 shrink-0">
        <div className="flex justify-between text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
          <span>
            {t("assessment.questionOf")
              .replace("{current}", String(currentStep + 1))
              .replace("{total}", String(quizData.questions.length))}
          </span>
          <span>
            {Math.round(progress)}% {t("assessment.complete")}
          </span>
        </div>
        <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-primary-container h-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-8 pr-2 pb-4">
        <h3 className="text-2xl font-display font-bold text-on-surface leading-tight">
          {currentQuestion.text}
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {currentQuestion.options.map((option: Option, idx: number) => (
            <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              className={cn(
                "w-full text-left p-6 rounded-2xl border-2 transition-all group relative overflow-hidden",
                selectedAnswers[currentQuestion.id] === option.id
                  ? "bg-primary-fixed border-primary shadow-md"
                  : "bg-surface-container-lowest border-outline-variant hover:border-primary",
              )}
            >
              <div className="flex items-center gap-4 relative z-10">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors",
                    selectedAnswers[currentQuestion.id] === option.id
                      ? "bg-primary-container text-white"
                      : "bg-surface-container text-on-surface-variant group-hover:bg-primary-fixed",
                  )}
                >
                  {String.fromCharCode(65 + idx)}
                </div>
                <span
                  className={cn(
                    "text-lg font-medium",
                    selectedAnswers[currentQuestion.id] === option.id
                      ? "text-primary font-bold"
                      : "text-on-surface-variant group-hover:text-on-surface",
                  )}
                >
                  {option.text}
                </span>
                {selectedAnswers[currentQuestion.id] === option.id && (
                  <CheckCircle2 className="w-6 h-6 text-primary ml-auto animate-in zoom-in" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-between items-center pt-6 border-t border-outline-variant shrink-0">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <Info className="w-4 h-4" />
          <span className="text-xs font-medium">
            {t("assessment.selectHint")}
          </span>
        </div>
        <button
          onClick={handleNext}
          disabled={selectedAnswers[currentQuestion.id] === undefined || submitting}
          className="bg-primary-container text-white px-8 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:grayscale flex items-center gap-2 active:translate-y-[1px] shadow-sm"
        >
          {submitting ? "Enviando..." : currentStep === quizData.questions.length - 1
            ? t("assessment.finish")
            : t("assessment.next")}
          {!submitting && <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
