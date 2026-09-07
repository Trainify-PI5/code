import { useState, useEffect } from "react";
import { PlusCircle, Trash2, Save, CheckCircle } from "lucide-react";
import api from "../../services/api";

interface Option {
  text: string;
  isCorrect: boolean;
}

interface Question {
  text: string;
  options: Option[];
}

export default function AssessmentBuilder({ lessonId }: { lessonId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("Avaliação do Módulo");
  const [passingScore, setPassingScore] = useState(70);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    // Load assessment if exists
    api.get(`/assessments/lessons/${lessonId}`)
      .then(res => {
        if (res.data) {
          setTitle(res.data.title);
          setPassingScore(res.data.passingScore);
          setQuestions(res.data.questions || []);
        }
      })
      .catch(err => {
        console.log("No existing assessment found, starting fresh.");
      })
      .finally(() => setLoading(false));
  }, [lessonId]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { text: "", options: [{ text: "", isCorrect: true }, { text: "", isCorrect: false }] }
    ]);
  };

  const removeQuestion = (qIndex: number) => {
    setQuestions(questions.filter((_, i) => i !== qIndex));
  };

  const addOption = (qIndex: number) => {
    const newQs = [...questions];
    newQs[qIndex].options.push({ text: "", isCorrect: false });
    setQuestions(newQs);
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const newQs = [...questions];
    newQs[qIndex].options = newQs[qIndex].options.filter((_, i) => i !== oIndex);
    setQuestions(newQs);
  };

  const markCorrect = (qIndex: number, oIndex: number) => {
    const newQs = [...questions];
    newQs[qIndex].options.forEach((opt, i) => {
      opt.isCorrect = i === oIndex;
    });
    setQuestions(newQs);
  };

  const handleSave = async () => {
    if (questions.length === 0) return alert("Adicione pelo menos uma pergunta");
    setSaving(true);
    try {
      await api.post(`/assessments/lessons/${lessonId}`, {
        title,
        passingScore,
        questions
      });
      alert("Avaliação salva com sucesso!");
    } catch (error) {
      alert("Erro ao salvar avaliação");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Carregando avaliação...</div>;

  return (
    <div className="space-y-6 mt-4 bg-surface-bright p-6 rounded-xl border border-outline-variant">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg text-on-surface">Construtor de Avaliação</h3>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? "Salvando..." : "Salvar Avaliação"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold uppercase text-on-surface-variant block mb-1">Título</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant px-3 py-2 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase text-on-surface-variant block mb-1">Nota de Corte (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={passingScore}
            onChange={(e) => setPassingScore(Number(e.target.value))}
            className="w-full bg-surface-container border border-outline-variant px-3 py-2 rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="space-y-6">
        {questions.map((q, qIndex) => (
          <div key={qIndex} className="bg-surface-container rounded-lg p-4 border border-outline-variant space-y-4">
            <div className="flex justify-between gap-4">
              <input
                type="text"
                placeholder={`Pergunta ${qIndex + 1}`}
                value={q.text}
                onChange={(e) => {
                  const newQs = [...questions];
                  newQs[qIndex].text = e.target.value;
                  setQuestions(newQs);
                }}
                className="flex-1 bg-surface-bright border border-outline-variant px-3 py-2 rounded-lg text-sm font-semibold"
              />
              <button onClick={() => removeQuestion(qIndex)} className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 pl-4 border-l-2 border-outline-variant">
              {q.options.map((opt, oIndex) => (
                <div key={oIndex} className="flex items-center gap-3">
                  <button
                    onClick={() => markCorrect(qIndex, oIndex)}
                    className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center transition-colors ${opt.isCorrect ? 'bg-green-500 text-white' : 'bg-surface-bright border border-outline-variant text-transparent hover:border-green-500'}`}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    placeholder={`Opção ${oIndex + 1}`}
                    value={opt.text}
                    onChange={(e) => {
                      const newQs = [...questions];
                      newQs[qIndex].options[oIndex].text = e.target.value;
                      setQuestions(newQs);
                    }}
                    className="flex-1 bg-surface-bright border border-outline-variant px-3 py-1.5 rounded-lg text-sm"
                  />
                  <button onClick={() => removeOption(qIndex, oIndex)} className="text-red-500 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addOption(qIndex)}
                className="text-xs text-primary font-bold flex items-center gap-1 hover:underline mt-2"
              >
                <PlusCircle className="w-3 h-3" />
                Adicionar Opção
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addQuestion}
        className="w-full py-3 border-2 border-dashed border-outline-variant rounded-lg text-on-surface-variant font-bold text-sm hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
      >
        <PlusCircle className="w-4 h-4" />
        Adicionar Pergunta
      </button>
    </div>
  );
}
