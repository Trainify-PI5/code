import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, MessageSquare } from 'lucide-react';
import api from '../services/api';
import { VideoPlayer } from '../components/VideoPlayer';
import { useHeartbeat } from '../hooks/useHeartbeat';
import { useAuthStore } from '../store/authStore';

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

        // Seleciona a primeira lesson do primeiro módulo por padrão
        if (courseRes.data.modules && courseRes.data.modules.length > 0) {
           const firstMod = courseRes.data.modules[0];
           if (firstMod.lessons && firstMod.lessons.length > 0) {
              setActiveLesson(firstMod.lessons[0]);
           }
        }
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

  const handleVideoProgress = (time: number) => {
    setWatchedSeconds(time);
  };

  const handleVideoEnded = () => {
    setIsCompleted(true);
    // Aqui poderíamos avançar pra próxima aula automaticamente
  };

  if (loading) return <div className="p-8">Carregando player...</div>;
  if (!course) return <div className="p-8">Curso não encontrado.</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
      
      {/* Cabeçalho do Player */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <h1 className="font-semibold text-slate-800 dark:text-slate-100">
            {course.title}
          </h1>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setShowChat(!showChat)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showChat ? 'bg-primary text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
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
                  <div className="w-full h-[600px] shrink-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800">
                     <iframe 
                        src={mediaUrl.includes('docs.google.com') ? `${mediaUrl}?embedded=true` : mediaUrl}
                        className="w-full h-full border-none"
                        title="Documento da Aula"
                        allowFullScreen
                     />
                  </div>
                ) : activeLesson.lessonType === 'QUIZ' ? (
                  <div className="w-full shrink-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center py-24">
                     <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 className="w-10 h-10" />
                     </div>
                     <h3 className="text-2xl font-bold mb-2">Avaliação de Conhecimento</h3>
                     <p className="text-slate-500 mb-8 max-w-md text-center">Responda a este questionário para testar seus conhecimentos e pontuar no curso.</p>
                     <button onClick={() => navigate(`/lessons/${activeLesson.id}/assessment`)} className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity">
                        Iniciar Avaliação
                     </button>
                  </div>
                ) : null}
                
                <div className="p-8 max-w-5xl mx-auto w-full flex-1">
                   <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                     {activeLesson.title}
                   </h2>
                   <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                     {activeLesson.content || 'Nenhuma descrição fornecida para esta aula.'}
                   </div>
                </div>
             </>
           ) : (
             <div className="flex items-center justify-center h-full text-slate-500">
                Selecione uma aula no menu lateral.
             </div>
           )}

           {/* Gaveta do Assistente IA */}
           {showChat && (
              <div className="absolute top-0 right-0 h-full w-96 bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col z-10 animate-in slide-in-from-right-8 duration-300">
                 <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      Assistente do Curso
                    </h3>
                    <button onClick={() => setShowChat(false)} className="text-slate-400 hover:text-slate-600">×</button>
                 </div>
                 <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
                    {/* Aqui renderizaríamos as mensagens. Para simplificar, vou usar um state local ou conectar ao endpoint diretamente. */}
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl text-sm text-slate-700 dark:text-slate-300 max-w-[85%]">
                       Olá! Estou aqui para ajudar com qualquer dúvida sobre "{course.title}". O que você gostaria de saber?
                    </div>
                 </div>
                 <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                    <div className="flex gap-2">
                       <input 
                         type="text" 
                         placeholder="Faça uma pergunta..." 
                         className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                       />
                       <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                         Enviar
                       </button>
                    </div>
                 </div>
              </div>
           )}
        </div>

        {/* Barra Lateral de Aulas */}
        <div className="w-80 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 overflow-y-auto hidden lg:block">
           <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">Conteúdo do Curso</h3>
              <p className="text-xs text-slate-500 mt-1">{enrollment?.progressPercentage || 0}% concluído</p>
           </div>
           
           <div className="p-2 flex flex-col gap-4 mt-2">
              {course.modules?.map((mod: any) => (
                <div key={mod.id}>
                   <h4 className="px-2 mb-2 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                     {mod.title}
                   </h4>
                   <div className="flex flex-col gap-1">
                      {mod.lessons?.map((lesson: any) => (
                         <button 
                           key={lesson.id}
                           onClick={() => setActiveLesson(lesson)}
                           className={`flex items-start gap-3 p-3 text-left rounded-lg transition-colors ${
                             activeLesson?.id === lesson.id 
                               ? 'bg-primary/10 text-primary dark:bg-primary/20' 
                               : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                           }`}
                         >
                            <div className="shrink-0 mt-0.5">
                               {/* Na real, checaríamos o lesson_progress aqui */}
                               {activeLesson?.id === lesson.id ? (
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
                      ))}
                   </div>
                </div>
              ))}
           </div>
        </div>

      </div>
    </div>
  );
}
