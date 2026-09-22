import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Users, Target, RotateCcw } from "lucide-react";
import { cn } from "../lib/utils";
import api from "../services/api";

interface Attempt {
  id: string;
  lessonId: string;
  lessonTitle: string;
  studentId: string;
  studentName: string;
  attemptNumber: number;
  score: number;
  passingScore: number;
  passed: boolean;
  createdAt: string;
}

interface StudentRow {
  studentId: string;
  studentName: string;
  lessonTitle: string;
  attempts: number;
  bestScore: number;
  passed: boolean;
  lastAttemptAt: string;
}

export default function CourseResults() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [courseTitle, setCourseTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    Promise.all([
      api.get<Attempt[]>(`/assessments/courses/${id}/results`),
      api.get<{ title: string }>(`/courses/${id}`),
    ])
      .then(([resultsResponse, courseResponse]) => {
        if (cancelled) return;
        setAttempts(resultsResponse.data);
        setCourseTitle(courseResponse.data.title);
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar os resultados.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Uma linha por aluno e avaliação, com a melhor nota e o total de tentativas
  const rows = useMemo(() => {
    const byStudentAndLesson = new Map<string, StudentRow>();

    attempts.forEach((attempt) => {
      const key = `${attempt.studentId}:${attempt.lessonId}`;
      const current = byStudentAndLesson.get(key);

      if (!current) {
        byStudentAndLesson.set(key, {
          studentId: attempt.studentId,
          studentName: attempt.studentName,
          lessonTitle: attempt.lessonTitle,
          attempts: 1,
          bestScore: attempt.score,
          passed: attempt.passed,
          lastAttemptAt: attempt.createdAt,
        });
        return;
      }

      current.attempts += 1;
      current.bestScore = Math.max(current.bestScore, attempt.score);
      current.passed = current.passed || attempt.passed;
      if (attempt.createdAt > current.lastAttemptAt) current.lastAttemptAt = attempt.createdAt;
    });

    return Array.from(byStudentAndLesson.values()).sort((a, b) =>
      a.studentName.localeCompare(b.studentName)
    );
  }, [attempts]);

  const summary = useMemo(() => {
    if (rows.length === 0) return { students: 0, approved: 0, average: 0 };
    const students = new Set(rows.map((r) => r.studentId)).size;
    const approved = rows.filter((r) => r.passed).length;
    const average = Math.round(rows.reduce((total, r) => total + r.bestScore, 0) / rows.length);
    return { students, approved, average };
  }, [rows]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <button
        onClick={() => navigate("/courses")}
        className="flex items-center gap-2 text-on-surface-variant hover:text-primary"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para cursos
      </button>

      <div className="border-b border-outline-variant pb-6">
        <h1 className="text-3xl font-display font-bold text-on-surface">Resultados das avaliações</h1>
        <p className="text-on-surface-variant mt-1">{courseTitle}</p>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-on-surface-variant">
          <Loader2 className="w-5 h-5 animate-spin" /> Carregando resultados...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-outline-variant p-10 text-center text-on-surface-variant">
          Nenhum aluno respondeu às avaliações deste curso ainda.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6">
              <div className="flex items-center gap-2 text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-2">
                <Users className="w-4 h-4" /> Alunos avaliados
              </div>
              <p className="text-3xl font-display font-bold text-on-surface">{summary.students}</p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6">
              <div className="flex items-center gap-2 text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-2">
                <CheckCircle2 className="w-4 h-4" /> Aprovações
              </div>
              <p className="text-3xl font-display font-bold text-on-surface">
                {summary.approved}/{rows.length}
              </p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6">
              <div className="flex items-center gap-2 text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-2">
                <Target className="w-4 h-4" /> Nota média
              </div>
              <p className="text-3xl font-display font-bold text-on-surface">{summary.average}%</p>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-container text-on-surface-variant text-xs uppercase tracking-widest">
                <tr>
                  <th className="text-left px-6 py-4 font-bold">Aluno</th>
                  <th className="text-left px-6 py-4 font-bold">Avaliação</th>
                  <th className="text-left px-6 py-4 font-bold">Melhor nota</th>
                  <th className="text-left px-6 py-4 font-bold">Tentativas</th>
                  <th className="text-left px-6 py-4 font-bold">Situação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.studentId}-${row.lessonTitle}`} className="border-t border-outline-variant">
                    <td className="px-6 py-4 font-medium text-on-surface">{row.studentName}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{row.lessonTitle}</td>
                    <td className="px-6 py-4">
                      <span className={cn("font-bold", row.passed ? "text-green-600" : "text-red-500")}>
                        {row.bestScore}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      <span className="flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5" /> {row.attempts}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {row.passed ? (
                        <span className="inline-flex items-center gap-1.5 text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Aprovado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full text-xs font-bold">
                          <XCircle className="w-3.5 h-3.5" /> Reprovado
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
