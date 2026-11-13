import axios from 'axios';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { montarHistorico, perguntarAssistente, type FonteIa } from '../lib/iaChat';
import MarkdownText from '../components/MarkdownText';
import { ArrowLeft, CheckCircle2, Circle, List, Lock, MessageSquare } from 'lucide-react';
import api from '../services/api';
import { useHeartbeat } from '../hooks/useHeartbeat';
import { useAuthStore } from '../store/authStore';
import { Button, Input } from '../components/ui';
import { requestError } from '../lib/requestError';

const VideoPlayer = React.lazy(() => import('../components/VideoPlayer').then(m => ({ default: m.VideoPlayer })));

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
  const [params] = useSearchParams();
  const referencia = params.get('aula');
  return <PlayerDoCurso key={JSON.stringify([id, referencia])} id={id!} referencia={referencia} />;
}

type Falha = 'ausente' | 'acesso' | 'curso' | 'matricula' | 'progresso';

const mensagensDeFalha: Record<Falha, string> = {
  ausente: 'Curso não encontrado.',
  acesso: 'Você não tem acesso a este curso.',
  curso: 'Não foi possível carregar o curso.',
  matricula: 'Não foi possível verificar sua matrícula.',
  progresso: 'Não foi possível confirmar seu progresso e quais aulas estão liberadas.',
};

function progressoDoCurso(items: LessonProgressItem[], lessons: { id: string }[]) {
  const mapa = indexProgress(items);
  if (lessons.some(l => typeof mapa[l.id]?.locked !== 'boolean')) {
    throw new Error('Progresso incompleto');
  }
  return mapa;
}

function PlayerDoCurso({ id, referencia }: { id: string; referencia: string | null }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Estados
  const [course, setCourse] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [avisoFonte, setAvisoFonte] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showLessons, setShowLessons] = useState(false);
  const [falha, setFalha] = useState<Falha | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const preview = ['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(user?.role ?? '');
  const [loading, setLoading] = useState(true);
  const [initialTime, setInitialTime] = useState(0);
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [lessonProgress, setLessonProgress] = useState<Record<string, LessonProgressItem>>({});
  const [completing, setCompleting] = useState(false);
  const [perguntaIa, setPerguntaIa] = useState('');
  const [enviandoIa, setEnviandoIa] = useState(false);
  const [conversaIa, setConversaIa] = useState<{ role: 'user' | 'assistant'; text: string; sources?: FonteIa[]; erro?: boolean }[]>([]);

  const perguntarIa = async () => {
    const pergunta = perguntaIa.trim();
    if (!pergunta) return;

    const historico = montarHistorico(conversaIa.map((m) => ({ role: m.role, text: m.text, historico: !m.erro })));
    setEnviandoIa(true);
    setConversaIa((atual) => [...atual, { role: 'user', text: pergunta }]);
    setPerguntaIa('');
    try {
      // A aula aberta ganha prioridade e a busca fica restrita a este curso
      const resposta = await perguntarAssistente(pergunta, historico, { lessonId: activeLesson?.id, courseId: id });
      setConversaIa((atual) => [...atual, { role: 'assistant', text: resposta.response, sources: resposta.sources }]);
    } catch (err) {
      // O backend explica o motivo (sem acesso ao curso, pergunta vazia, serviço
      // fora do ar). Trocar tudo por "tente novamente" escondia o que houve de
      // quem usa e de quem vai investigar depois.
      console.error('Erro ao consultar o assistente', err);
      setConversaIa((atual) => [...atual, {
        role: 'assistant',
        text: requestError(err, 'O assistente não respondeu. Tente novamente.'),
        erro: true,
      }]);
    } finally {
      setEnviandoIa(false);
    }
  };

  useEffect(() => {
    let atual = true;
    const carregar = async () => {
      setLoading(true);
      setFalha(null);
      setActiveLesson(null);
      setEnrollment(null);
      let etapa: Falha = 'curso';
      try {
        const { data: curso } = await api.get(`/courses/${id}`);
        if (!atual) return;
        etapa = 'matricula';
        const { data: matriculas } = await api.get('/enrollments');
        if (!atual) return;
        const matricula = matriculas.find((item: any) => item.course?.id === id);
        if (!matricula && !preview) {
          setFalha('acesso');
          return;
        }
        etapa = 'progresso';
        const aulas = (curso.modules || []).flatMap((mod: any) => mod.lessons || []);
        const progresso = matricula
          ? progressoDoCurso((await api.get(`/progress/enrollments/${matricula.id}/lessons`)).data, aulas)
          : {};
        if (!atual) return;
        const liberadas = matricula ? aulas.filter((l: any) => progresso[l.id]?.locked === false) : aulas;
        setCourse(curso);
        setEnrollment(matricula);
        setLessonProgress(progresso);
        const citada = liberadas.find((aula: { id: string }) => aula.id === referencia);
        setAvisoFonte(referencia && !citada ? 'A aula de referência não está disponível para você neste momento.' : '');
        setActiveLesson(citada || liberadas.find((l: any) => progresso[l.id]?.status !== 'COMPLETED') || liberadas[0] || null);
      } catch (erro) {
        if (!atual) return;
        const status = axios.isAxiosError(erro) ? erro.response?.status : undefined;
        setFalha(status === 403 ? 'acesso' : etapa === 'curso' && status === 404 ? 'ausente' : etapa);
      } finally {
        if (atual) setLoading(false);
      }
    };
    void carregar();
    return () => { atual = false; };
  }, [id, tentativa, preview, referencia]);

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
      const aulas = course.modules.flatMap((mod: any) => mod.lessons || []);
      const mapa = progressoDoCurso(progressRes.data, aulas);
      setLessonProgress(mapa);
      if (activeLesson && mapa[activeLesson.id]?.locked !== false) setActiveLesson(null);
    } catch (e) {
      setActiveLesson(null);
      setFalha('progresso');
    }
  }, [enrollment?.id, course, activeLesson]);

  const aulasDoCurso = (course?.modules ?? []).flatMap((mod: any) => mod.lessons ?? []);
  const aulasConcluidas = aulasDoCurso.length > 0 && aulasDoCurso.every(
    (l: { id: string }) => lessonProgress[l.id]?.status === 'COMPLETED'
  );
  useEffect(() => {
    if (!enrollment?.id || enrollment.status === 'COMPLETED' || !aulasConcluidas) return;
    let cancelado = false;
    let timer: ReturnType<typeof setTimeout>;
    const conferir = async (tentativa: number) => {
      try {
        const { data } = await api.get('/enrollments');
        const atual = data.find((item: { id: string }) => item.id === enrollment.id);
        if (cancelado) return;
        if (atual?.status === 'COMPLETED') {
          setEnrollment(atual);
          return;
        }
      } catch {
        // O progresso das aulas continua disponível enquanto a matrícula é atualizada.
      }
      if (!cancelado && tentativa < 3) timer = setTimeout(() => conferir(tentativa + 1), tentativa * 1500);
    };
    void conferir(1);
    return () => { cancelado = true; clearTimeout(timer); };
  }, [aulasConcluidas, enrollment?.id, enrollment?.status]);

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

  if (loading) return <div role="status" className="p-8">Carregando curso e aulas...</div>;
  if (falha || !course) return (
    <section className="mx-auto max-w-lg space-y-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
      <h1 className="text-xl font-semibold text-on-surface" role="alert">{mensagensDeFalha[falha ?? 'curso']}</h1>
      <div className="flex flex-wrap gap-3">
        {falha !== 'ausente' && falha !== 'acesso' && (
          <Button onClick={() => setTentativa(n => n + 1)}>Tentar novamente</Button>
        )}
        <Button variant="secondary" onClick={() => navigate('/courses')}>Voltar aos cursos</Button>
      </div>
    </section>
  );

  const allLessons = aulasDoCurso;
  const progressItems = Object.values(lessonProgress);
  // Mesmo calculo do backend (aulas concluidas / total). O percentual da matricula
  // e recalculado de forma assincrona e chegaria desatualizado logo apos concluir.
  const progressPercentage = progressItems.length > 0 && allLessons.length > 0
    ? Math.round((progressItems.filter((p) => p.status === 'COMPLETED').length / allLessons.length) * 100)
    : (enrollment?.progressPercent || 0);
  const activeCompleted = !!activeLesson && lessonProgress[activeLesson.id]?.status === 'COMPLETED';
  const canMarkAsCompleted = !!enrollment
    && (activeLesson?.lessonType === 'ARTICLE' || activeLesson?.lessonType === 'DOCUMENT');

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant">

      {/* Cabeçalho do Player */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-outline-variant bg-surface-container-low shrink-0">
        <div className="flex min-w-0 items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-surface-container rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-on-surface-variant" />
          </button>
          <h1 className="font-semibold text-on-surface break-words min-w-0">
            {course.title}
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            className="lg:hidden"
            aria-expanded={showLessons}
            aria-controls="course-lessons"
            onClick={() => setShowLessons((open) => !open)}
          >
            <List className="w-4 h-4" />
            Conteúdo do curso
          </Button>
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

      {enrollment?.status === 'COMPLETED' && aulasConcluidas && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant bg-primary-fixed px-4 py-3">
          <strong className="text-on-surface">Curso concluído</strong>
          <Button onClick={() => navigate('/certifications')}>Ver meus certificados</Button>
        </div>
      )}
      {avisoFonte && <p role="status" className="border-b border-outline-variant bg-surface-container px-4 py-3 text-sm text-on-surface">{avisoFonte}</p>}
      {/* Área de Conteúdo Principal */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">

        {/* Vídeo e Descrição */}
        <div className="flex-1 min-h-0 min-w-0 overflow-y-auto flex flex-col relative">
           {activeLesson ? (
             <>
                {activeLesson.lessonType === 'VIDEO' && mediaUrl ? (
                  <div className="w-full bg-black shrink-0">
                     <div className="max-w-5xl mx-auto w-full">
                       <React.Suspense fallback={<p role="status" className="p-4 text-white">Carregando vídeo...</p>}>
                       <VideoPlayer
                         videoUrl={mediaUrl}
                         initialTime={initialTime}
                         onProgress={handleVideoProgress}
                         onEnded={handleVideoEnded}
                         className="rounded-none shadow-none"
                       />
                       </React.Suspense>
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
                   <h2 className="text-2xl font-bold text-on-surface min-w-0 mb-4">
                     {activeLesson.title}
                   </h2>
                   {/* O texto da aula pode ter titulos, listas e paragrafos (aulas geradas
                       pela IA e textos longos como as NRs); sem isto, virava um bloco so */}
                   <div className="max-w-none text-on-surface-variant leading-relaxed">
                     {activeLesson.content
                       ? <MarkdownText text={activeLesson.content} />
                       : 'Nenhuma descrição fornecida para esta aula.'}
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
                {allLessons.length ? 'Nenhuma aula está liberada no momento.' : 'Este curso ainda não tem aulas.'}
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
                    {conversaIa.map((m, i) => (
                      m.role === 'user' ? (
                        <div key={i} className="self-end bg-primary-container text-white p-3 rounded-xl text-sm max-w-[85%] whitespace-pre-wrap break-words">
                          {m.text}
                        </div>
                      ) : (
                        <div key={i} className={`p-3 rounded-xl text-sm max-w-[90%] ${m.erro ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300' : 'bg-primary-fixed text-on-surface'}`}>
                          <MarkdownText text={m.text} sources={m.sources} />
                        </div>
                      )
                    ))}
                    {enviandoIa && (
                      <div className="bg-surface-container p-3 rounded-xl text-sm text-on-surface-variant max-w-[85%] animate-pulse">
                        Pensando...
                      </div>
                    )}
                 </div>
                 <div className="p-4 border-t border-outline-variant bg-surface-container-low">
                    <div className="flex gap-2">
                       <Input
                         type="text"
                         aria-label="Pergunta para o assistente"
                         placeholder="Faça uma pergunta..."
                         className="py-2"
                         wrapperClassName="flex-1"
                         value={perguntaIa}
                         onChange={(e) => setPerguntaIa(e.target.value)}
                         onKeyDown={(e) => {
                           if (e.key === 'Enter') perguntarIa();
                         }}
                         disabled={enviandoIa}
                       />
                       <Button onClick={perguntarIa} disabled={enviandoIa || !perguntaIa.trim()}>
                         Enviar
                       </Button>
                    </div>
                 </div>
              </div>
           )}
        </div>

        {/* Barra Lateral de Aulas */}
        <div
          id="course-lessons"
          role="region"
          aria-label="Conteúdo do curso"
          className={`order-first lg:order-last w-full lg:w-80 max-h-[40%] lg:max-h-none shrink-0 border-b lg:border-b-0 lg:border-l border-outline-variant bg-surface-container-low overflow-y-auto ${showLessons ? 'block' : 'hidden'} lg:block`}
        >
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
                         const locked = !!enrollment && progress?.locked !== false;
                         const completed = progress?.status === 'COMPLETED';

                         return (
                           <button
                             key={lesson.id}
                             onClick={() => {
                               if (locked) return;
                               setActiveLesson(lesson);
                               setShowLessons(false);
                             }}
                             aria-current={activeLesson?.id === lesson.id ? 'true' : undefined}
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
                                 {completed && <span className="text-xs">Concluída</span>}
                                 {locked && <span className="text-xs">Conclua a aula anterior para liberar</span>}
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
