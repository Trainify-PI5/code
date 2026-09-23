import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, Lock, MessageSquare } from 'lucide-react';
import api from '../services/api';
import { VideoPlayer } from '../components/VideoPlayer';
import { useHeartbeat } from '../hooks/useHeartbeat';
import { useAuthStore } from '../store/authStore';
import { Button, Input } from '../components/ui';

const LESSON_TYPE_LABEL: Record<string, string> = {
  VIDEO: 'Vídeo',
  DOCUMENT: 'Documento',
  QUIZ: 'Avaliação',
  ARTICLE: 'Texto',
};

// Monta o subtitulo da aula na barra lateral a partir do que a API devolve.
// Aula sem duracao (texto, quiz, video ainda sem transcodificar) mostra so o tipo.
function formatLessonMeta(lesson: any): string {
  const label = LESSON_TYPE_LABEL[lesson?.lessonType] || LESSON_TYPE_LABEL.ARTICLE;
  const seconds = lesson?.durationSeconds;

  if (!seconds || seconds <= 0) return label;

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  const duration = minutes === 0 ? `${rest}s` : rest === 0 ? `${minutes}m` : `${minutes}m ${rest}s`;

  return `${label} • ${duration}`;
}

interface LessonProgressItem {
  lessonId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  watchedSeconds: number;
  locked: boolean;
}

function indexProgress(items: LessonProgressItem[]): Record<string, LessonProgressItem> {
  return Object.fromEntries(items.map((item) => [item.lessonId, item]));
}

export default function LessonPlayer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Estados
  const [course, setCourse] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialTime, setInitialTime] = useState(0);
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [lessonProgress, setLessonProgress] = useState<Record<string, LessonProgressItem>>({});
  const [completing, setCompleting] = useState(false);

  // Carregar dados (mock ou api)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const courseRes = await api.get(`/courses/${id}`);
        setCourse(courseRes.data);

        // Pega o enrollment do user atual para este curso
        const enrollmentRes = await api.get('/enrollments');
        const currentEnrollment = enrollmentRes.data.find((e: any) => e.course?.id === id);
        setEnrollment(currentEnrollment);

        // Status e bloqueio de cada aula vem do backend. Sem matricula (ex.: preview
        // do instrutor) nao ha progresso e nenhuma aula e bloqueada.
        let progressById: Record<string, LessonProgressItem> = {};
        if (currentEnrollment?.id) {
          try {
            const progressRes = await api.get(`/progress/enrollments/${currentEnrollment.id}/lessons`);
            progressById = indexProgress(progressRes.data);
          } catch (e) {
            console.error(e);
          }
        }
        setLessonProgress(progressById);

        // Retoma de onde o aluno parou: primeira aula liberada ainda nao concluida
        const lessons = (courseRes.data.modules || []).flatMap((mod: any) => mod.lessons || []);
        const resumeLesson = lessons.find((lesson: any) => {
          const progress = progressById[lesson.id];
          return progress && !progress.locked && progress.status !== 'COMPLETED';
        });
        setActiveLesson(resumeLesson || lessons[0] || null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    // Limpa a midia da aula anterior e descarta respostas que chegarem depois de
    // uma nova troca, senao a aula atual exibe o video/documento de outra.
    let cancelled = false;
    setMediaUrl('');

    const fetchMedia = async () => {
      if (!activeLesson?.videoAssetId) return;
      try {
        const res = await api.get(`/media/${activeLesson.videoAssetId}/play`);
        if (!cancelled) setMediaUrl(res.data.url);
      } catch (e) {
        if (!cancelled) setMediaUrl('');
      }
    };
    fetchMedia();

    return () => { cancelled = true; };
  }, [activeLesson?.id, activeLesson?.videoAssetId]);

  useEffect(() => {
    // Mesmo cuidado da midia: o progresso salvo da aula anterior nao pode
    // reposicionar o video da aula atual.
    let cancelled = false;
    setInitialTime(0);

    const fetchProgress = async () => {
      if (!enrollment?.id || !activeLesson?.id) return;
      try {
        const progressRes = await api.get(`/progress/enrollments/${enrollment.id}/lessons/${activeLesson.id}`);
        if (!cancelled) setInitialTime(progressRes.data?.watchedSeconds || 0);
      } catch (e) {
        if (!cancelled) setInitialTime(0);
      }
    };
    fetchProgress();

    return () => { cancelled = true; };
  }, [enrollment?.id, activeLesson?.id]);

  // Hook de Heartbeat
  const { setWatchedSeconds, setIsCompleted } = useHeartbeat({
    enrollmentId: enrollment?.id,
    lessonId: activeLesson?.id,
    enabled: !!enrollment && !!activeLesson
  });

  const refreshProgress = useCallback(async () => {
    if (!enrollment?.id) return;
    try {
      const progressRes = await api.get(`/progress/enrollments/${enrollment.id}/lessons`);
      setLessonProgress(indexProgress(progressRes.data));
    } catch (e) {
      console.error(e);
    }
  }, [enrollment?.id]);

  const handleVideoProgress = (time: number) => {
    setWatchedSeconds(time);
  };

  const handleVideoEnded = async () => {
    // Atualiza a lista so depois que o backend registrou, liberando a proxima aula
    await setIsCompleted(true);
    await refreshProgress();
    // Aqui poderíamos avançar pra próxima aula automaticamente
  };

  // Texto e documento nao tem evento de fim, entao a conclusao e feita pelo aluno
  const handleMarkAsCompleted = async () => {
    setCompleting(true);
    try {
      await setIsCompleted(true);
      await refreshProgress();
    } finally {
      setCompleting(false);
    }
  };

  if (loading) return <div className="p-8">Carregando player...</div>;
  if (!course) return <div className="p-8">Curso não encontrado.</div>;

  const allLessons = (course.modules || []).flatMap((mod: any) => mod.lessons || []);
  const progressItems = Object.values(lessonProgress);
  // Mesmo calculo do backend (aulas concluidas / total). O percentual da matricula
  // e recalculado de forma assincrona e chegaria desatualizado logo apos concluir.
  const progressPercentage = progressItems.length > 0 && allLessons.length > 0
    ? Math.round((progressItems.filter((p) => p.status === 'COMPLETED').length / allLessons.length) * 100)
    : (enrollment?.progressPercentage || 0);
  const activeCompleted = !!activeLesson && lessonProgress[activeLesson.id]?.status === 'COMPLETED';
  const canMarkAsCompleted = !!enrollment
    && (activeLesson?.lessonType === 'ARTICLE' || activeLesson?.lessonType === 'DOCUMENT');

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant">

      {/* Cabeçalho do Player */}
      <div className="flex items-center justify-between p-4 border-b border-outline-variant bg-surface-container-low shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-surface-container rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-on-surface-variant" />
          </button>
          <h1 className="font-semibold text-on-surface">
            {course.title}
          </h1>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowChat(!showChat)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showChat ? 'bg-primary-container text-white' : 'bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-low text-on-surface-variant'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Assistente IA
          </button>
        </div>
      </div>

      {/* Área de Conteúdo Principal */}
      <div className="flex flex-1 overflow-hidden">

        {/* Vídeo e Descrição */}
        <div className="flex-1 overflow-y-auto flex flex-col relative">
           {activeLesson ? (
             <>
                {activeLesson.lessonType === 'VIDEO' && mediaUrl ? (
                  <div className="w-full bg-black shrink-0">
                     <div className="max-w-5xl mx-auto w-full">
                       <VideoPlayer
                         videoUrl={mediaUrl}
                         initialTime={initialTime}
                         onProgress={handleVideoProgress}
                         onEnded={handleVideoEnded}
                         className="rounded-none shadow-none"
                       />
                     </div>
                  </div>
                ) : activeLesson.lessonType === 'DOCUMENT' && mediaUrl ? (
                  <div className="w-full h-[600px] shrink-0 bg-surface-container border-b border-outline-variant">
                     <iframe
                        src={mediaUrl.includes('docs.google.com') ? `${mediaUrl}?embedded=true` : mediaUrl}
                        className="w-full h-full border-none"
                        title="Documento da Aula"
                        allowFullScreen
                     />
                  </div>
                ) : activeLesson.lessonType === 'QUIZ' ? (
                  <div className="w-full shrink-0 bg-surface-container border-b border-outline-variant flex flex-col items-center justify-center py-24">
                     <div className="w-20 h-20 bg-primary-fixed text-primary rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 className="w-10 h-10" />
                     </div>
                     <h3 className="text-2xl font-bold mb-2">Avaliação de Conhecimento</h3>
                     <p className="text-on-surface-variant mb-8 max-w-md text-center">Responda a este questionário para testar seus conhecimentos e pontuar no curso.</p>
                     <Button size="lg" onClick={() => navigate(`/lessons/${activeLesson.id}/assessment`)}>
                        Iniciar Avaliação
                     </Button>
                  </div>
                ) : null}

                <div className="p-8 max-w-5xl mx-auto w-full flex-1">
                   <h2 className="text-2xl font-bold text-on-surface mb-4">
                     {activeLesson.title}
                   </h2>
                   <div className="prose dark:prose-invert max-w-none text-on-surface-variant">
                     {activeLesson.content || 'Nenhuma descrição fornecida para esta aula.'}
                   </div>
                   {canMarkAsCompleted && (
                     <Button
                       className="mt-8"
                       onClick={handleMarkAsCompleted}
                       disabled={activeCompleted || completing}
                     >
                       <CheckCircle2 className="w-4 h-4" />
                       {activeCompleted ? 'Aula concluída' : completing ? 'Salvando...' : 'Marcar como concluída'}
                     </Button>
                   )}
                </div>
             </>
           ) : (
             <div className="flex items-center justify-center h-full text-on-surface-variant">
                Selecione uma aula no menu lateral.
             </div>
           )}

           {/* Gaveta do Assistente IA */}
           {showChat && (
              <div className="absolute top-0 right-0 h-full w-96 bg-surface-container-lowest shadow-2xl border-l border-outline-variant flex flex-col z-10 animate-in slide-in-from-right-8 duration-300">
                 <div className="p-4 border-b border-outline-variant bg-surface-container-low flex items-center justify-between">
                    <h3 className="font-semibold text-on-surface flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      Assistente do Curso
                    </h3>
                    <button onClick={() => setShowChat(false)} className="text-on-surface-variant hover:text-on-surface">×</button>
                 </div>
                 <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
                    {/* Aqui renderizaríamos as mensagens. Para simplificar, vou usar um state local ou conectar ao endpoint diretamente. */}
                    <div className="bg-surface-container p-3 rounded-xl text-sm text-on-surface-variant max-w-[85%]">
                       Olá! Estou aqui para ajudar com qualquer dúvida sobre "{course.title}". O que você gostaria de saber?
                    </div>
                 </div>
                 <div className="p-4 border-t border-outline-variant bg-surface-container-low">
                    <div className="flex gap-2">
                       <Input
                         type="text"
                         aria-label="Pergunta para o assistente"
                         placeholder="Faça uma pergunta..."
                         className="py-2"
                         wrapperClassName="flex-1"
                       />
                       <Button>Enviar</Button>
                    </div>
                 </div>
              </div>
           )}
        </div>

        {/* Barra Lateral de Aulas */}
        <div className="w-80 shrink-0 border-l border-outline-variant bg-surface-container-low overflow-y-auto hidden lg:block">
           <div className="p-4 border-b border-outline-variant">
              <h3 className="font-semibold text-on-surface">Conteúdo do Curso</h3>
              <p className="text-xs text-on-surface-variant mt-1">{progressPercentage}% concluído</p>
           </div>

           <div className="p-2 flex flex-col gap-4 mt-2">
              {course.modules?.map((mod: any) => (
                <div key={mod.id}>
                   <h4 className="px-2 mb-2 text-sm font-bold text-on-surface-variant uppercase tracking-wider">
                     {mod.title}
                   </h4>
                   <div className="flex flex-col gap-1">
                      {mod.lessons?.map((lesson: any) => {
                         const progress = lessonProgress[lesson.id];
                         const locked = !!progress?.locked;
                         const completed = progress?.status === 'COMPLETED';

                         return (
                           <button
                             key={lesson.id}
                             onClick={() => { if (!locked) setActiveLesson(lesson); }}
                             disabled={locked}
                             title={locked ? 'Conclua a aula anterior para liberar' : undefined}
                             className={`flex items-start gap-3 p-3 text-left rounded-lg transition-colors ${
                               locked
                                 ? 'opacity-50 cursor-not-allowed text-outline-variant'
                                 : activeLesson?.id === lesson.id
                                   ? 'bg-primary-fixed text-primary'
                                   : 'hover:bg-surface-container-low text-on-surface-variant'
                             }`}
                           >
                              <div className="shrink-0 mt-0.5">
                                 {locked ? (
                                   <Lock className="w-4 h-4" />
                                 ) : completed ? (
                                   <CheckCircle2 className="w-4 h-4 text-green-600" />
                                 ) : activeLesson?.id === lesson.id ? (
                                   <Circle className="w-4 h-4 fill-primary/20" />
                                 ) : (
                                   <Circle className="w-4 h-4" />
                                 )}
                              </div>
                              <div>
                                 <p className="text-sm font-medium line-clamp-2 leading-tight">
                                   {lesson.title}
                                 </p>
                                 <p className="text-xs opacity-70 mt-1">{formatLessonMeta(lesson)}</p>
                              </div>
                           </button>
                         );
                      })}
                   </div>
                </div>
              ))}
           </div>
        </div>

      </div>
    </div>
  );
}
