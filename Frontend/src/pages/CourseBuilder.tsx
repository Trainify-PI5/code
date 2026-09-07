import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Send, BookOpen, Layers, Video, FileText, CheckCircle2 } from 'lucide-react';
import { UploadMedia } from '../components/UploadMedia';
import AssessmentBuilder from '../components/Course/AssessmentBuilder';
import api from '../services/api';
import { useNavigate, useParams } from 'react-router-dom';

interface Lesson {
  id?: string;
  title: string;
  description: string;
  content?: string;
  lessonType: string;
  videoAssetId?: string;
  externalUrl?: string;
  provider?: string;
}

interface Module {
  id?: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

export const CourseBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [modules, setModules] = useState<Module[]>([]);

  useEffect(() => {
    if (id) {
      loadCourse(id);
    }
  }, [id]);

  const loadCourse = async (courseId: string) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/courses/${courseId}`);
      setCourseTitle(data.title);
      setCourseDesc(data.description || '');
      
      const loadedModules = data.modules.map((m: any) => ({
        id: m.id,
        title: m.title,
        description: m.description || '',
        lessons: m.lessons.map((l: any) => ({
          id: l.id,
          title: l.title,
          description: l.content || '',
          content: l.content || '',
          lessonType: l.videoAssetId ? 'VIDEO' : 'ARTICLE',
          videoAssetId: l.videoAssetId
        }))
      }));
      setModules(loadedModules);
    } catch (err) {
      console.error('Erro ao carregar curso', err);
      alert('Erro ao carregar os dados do curso.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddModule = () => {
    setModules([...modules, { title: '', description: '', lessons: [] }]);
  };

  const handleModuleChange = (index: number, field: keyof Module, value: string) => {
    const updatedModules = [...modules];
    updatedModules[index] = { ...updatedModules[index], [field]: value };
    setModules(updatedModules);
  };

  const handleAddLesson = (moduleIndex: number) => {
    const updatedModules = [...modules];
    updatedModules[moduleIndex].lessons.push({ title: '', description: '', lessonType: 'VIDEO' });
    setModules(updatedModules);
  };

  const handleLessonChange = (moduleIndex: number, lessonIndex: number, field: keyof Lesson, value: string) => {
    const updatedModules = [...modules];
    updatedModules[moduleIndex].lessons[lessonIndex] = { ...updatedModules[moduleIndex].lessons[lessonIndex], [field]: value };
    setModules(updatedModules);
  };

  const handleRemoveModule = async (index: number) => {
    const mod = modules[index];
    if (mod.id) {
      if (!window.confirm('Tem certeza que deseja excluir este módulo e todas as suas lições?')) return;
      try {
        await api.delete(`/modules/${mod.id}`);
      } catch (err) {
        alert('Erro ao excluir módulo.');
        return;
      }
    }
    const updatedModules = [...modules];
    updatedModules.splice(index, 1);
    setModules(updatedModules);
  };

  const handleRemoveLesson = async (moduleIndex: number, lessonIndex: number) => {
    const less = modules[moduleIndex].lessons[lessonIndex];
    if (less.id) {
      if (!window.confirm('Tem certeza que deseja excluir esta lição?')) return;
      try {
        await api.delete(`/lessons/${less.id}`);
      } catch (err) {
        alert('Erro ao excluir lição.');
        return;
      }
    }
    const updatedModules = [...modules];
    updatedModules[moduleIndex].lessons.splice(lessonIndex, 1);
    setModules(updatedModules);
  };

  const saveCourse = async (publish: boolean) => {
    if (!courseTitle) return alert('Título do curso é obrigatório.');

    try {
      setLoading(true);
      let courseId = id;
      
      // 1. Criar ou Atualizar Curso
      if (courseId) {
        await api.put(`/courses/${courseId}`, { title: courseTitle, description: courseDesc });
      } else {
        const { data: course } = await api.post('/courses', { title: courseTitle, description: courseDesc });
        courseId = course.id;
      }
      
      // 2. Criar Módulos e Lições
      for (const mod of modules) {
        if (!mod.title) continue;
        let moduleId = mod.id;

        if (moduleId) {
          await api.put(`/modules/${moduleId}`, { title: mod.title, description: mod.description });
        } else {
          const { data: createdMod } = await api.post(`/courses/${courseId}/modules`, { title: mod.title, description: mod.description });
          moduleId = createdMod.id;
        }
        
        for (const less of mod.lessons) {
          if (!less.title) continue;
          
          let finalVideoAssetId = less.videoAssetId;
          
          if (less.externalUrl && less.provider && !less.videoAssetId) {
             const { data: mediaRes } = await api.post('/media/external', {
                 provider: less.provider,
                 url: less.externalUrl
             });
             finalVideoAssetId = mediaRes.id;
          }
          
          if (less.id) {
            await api.put(`/lessons/${less.id}`, { 
              title: less.title, 
              content: less.description, 
              videoAssetId: finalVideoAssetId
            });
          } else {
            await api.post(`/modules/${moduleId}/lessons`, { 
              title: less.title, 
              content: less.description, 
              videoAssetId: finalVideoAssetId
            });
          }
        }
      }

      // 3. Publicar ou Despublicar
      if (publish) {
        await api.patch(`/courses/${courseId}/publish`);
        alert('Curso publicado com sucesso!');
      } else {
        alert('Rascunho salvo com sucesso!');
      }
      navigate('/courses');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar curso: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <BookOpen className="text-primary w-8 h-8" /> 
            {id ? 'Editar Curso' : 'Construtor de Curso'}
          </h1>
          <p className="text-slate-500 mt-2">Crie ou edite a estrutura do seu curso.</p>
        </div>
        <div className="flex gap-3">
          <button 
            disabled={loading}
            onClick={() => saveCourse(false)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Salvar Rascunho
          </button>
          <button 
            disabled={loading}
            onClick={() => saveCourse(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white hover:bg-primary/90 rounded-lg transition-colors font-medium shadow-md shadow-primary/20 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            Publicar Curso
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">1. Informações Básicas</h2>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Título do Curso</label>
          <input 
            type="text" 
            value={courseTitle}
            onChange={(e) => setCourseTitle(e.target.value)}
            placeholder="Ex: Introdução à Programação"
            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
          <textarea 
            value={courseDesc}
            onChange={(e) => setCourseDesc(e.target.value)}
            placeholder="O que os alunos vão aprender..."
            rows={3}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
          />
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5" />
            2. Estrutura do Curso (Módulos)
          </h2>
        </div>

        {modules.map((mod, modIdx) => (
          <div key={modIdx} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 mr-4">
                <input 
                  type="text" 
                  value={mod.title}
                  onChange={(e) => handleModuleChange(modIdx, 'title', e.target.value)}
                  placeholder={`Módulo ${modIdx + 1}: Título do Módulo`}
                  className="w-full text-lg font-bold px-3 py-2 bg-transparent border-b-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none transition-all rounded-t-md text-slate-900 dark:text-white"
                />
              </div>
              <button onClick={() => handleRemoveModule(modIdx)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-2 rounded-lg transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-4">
              {mod.lessons.map((less, lessIdx) => (
                <div key={lessIdx} className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex gap-4 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="mt-2 text-slate-400">
                    {less.lessonType === 'VIDEO' ? <Video className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex gap-3">
                      <select 
                        value={less.lessonType}
                        onChange={(e) => handleLessonChange(modIdx, lessIdx, 'lessonType', e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm font-medium outline-none text-slate-900 dark:text-white"
                      >
                        <option value="VIDEO">Vídeo</option>
                        <option value="DOCUMENT">Documento (Docs/PDF)</option>
                        <option value="ARTICLE">Artigo</option>
                        <option value="QUIZ">Quiz</option>
                      </select>
                      <input 
                        type="text" 
                        value={less.title}
                        onChange={(e) => handleLessonChange(modIdx, lessIdx, 'title', e.target.value)}
                        placeholder="Título da Lição"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <button onClick={() => handleRemoveLesson(modIdx, lessIdx)} className="text-red-400 hover:text-red-500 p-1.5 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {less.lessonType === 'VIDEO' ? (
                      <div className="pt-2 space-y-3">
                        <label className="block text-xs font-medium text-slate-500">Mídia do Vídeo</label>
                        
                        <div className="flex gap-4 mb-2">
                           <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                             <input type="radio" checked={less.provider !== 'YOUTUBE'} onChange={() => { handleLessonChange(modIdx, lessIdx, 'provider', 'S3'); handleLessonChange(modIdx, lessIdx, 'externalUrl', ''); handleLessonChange(modIdx, lessIdx, 'videoAssetId', ''); }} />
                             Fazer Upload
                           </label>
                           <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                             <input type="radio" checked={less.provider === 'YOUTUBE'} onChange={() => { handleLessonChange(modIdx, lessIdx, 'provider', 'YOUTUBE'); handleLessonChange(modIdx, lessIdx, 'videoAssetId', ''); }} />
                             Link do YouTube
                           </label>
                        </div>

                        {less.videoAssetId && less.provider !== 'YOUTUBE' ? (
                           <div className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border border-emerald-200 dark:border-emerald-500/20 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2">
                             <CheckCircle2 className="w-4 h-4" /> Vídeo salvo e associado com sucesso.
                             <button className="ml-auto text-xs underline" onClick={() => handleLessonChange(modIdx, lessIdx, 'videoAssetId', '')}>Remover</button>
                           </div>
                        ) : less.provider === 'YOUTUBE' ? (
                           <input 
                             type="text" 
                             value={less.externalUrl || ''}
                             onChange={(e) => handleLessonChange(modIdx, lessIdx, 'externalUrl', e.target.value)}
                             placeholder="Ex: https://www.youtube.com/watch?v=..."
                             className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                           />
                        ) : (
                          <UploadMedia onUploadComplete={(id) => handleLessonChange(modIdx, lessIdx, 'videoAssetId', id)} />
                        )}
                      </div>
                    ) : less.lessonType === 'DOCUMENT' ? (
                      <div className="pt-2 space-y-3">
                         <label className="block text-xs font-medium text-slate-500">Documento (Google Docs)</label>
                         <p className="text-xs text-slate-400">Insira o link público do Google Docs.</p>
                         <input 
                             type="text" 
                             value={less.externalUrl || ''}
                             onChange={(e) => {
                                handleLessonChange(modIdx, lessIdx, 'externalUrl', e.target.value);
                                handleLessonChange(modIdx, lessIdx, 'provider', 'GOOGLE_DOCS');
                             }}
                             placeholder="Ex: https://docs.google.com/document/d/..."
                             className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                           />
                      </div>
                    ) : less.lessonType === 'QUIZ' ? (
                      <div className="pt-2 space-y-3">
                        {less.id ? (
                           <AssessmentBuilder lessonId={less.id} />
                        ) : (
                           <div className="p-4 bg-yellow-50 text-yellow-800 text-sm rounded-lg border border-yellow-200">
                             ⚠️ Você precisa salvar o rascunho do curso (para gerar o ID da lição) antes de adicionar as perguntas deste Quiz.
                           </div>
                        )}
                      </div>
                    ) : (
                      <div className="pt-2">
                        <label className="block text-xs font-medium text-slate-500 mb-2">Conteúdo (Texto)</label>
                        <textarea 
                          value={less.description}
                          onChange={(e) => handleLessonChange(modIdx, lessIdx, 'description', e.target.value)}
                          placeholder="Digite o conteúdo da lição..."
                          rows={3}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50 resize-none text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              <button 
                onClick={() => handleAddLesson(modIdx)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" /> Adicionar Lição
              </button>
            </div>
          </div>
        ))}

        <button 
          onClick={handleAddModule}
          className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-500 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2"
        >
          <Plus className="w-6 h-6" />
          <span className="font-medium">Adicionar Novo Módulo</span>
        </button>
      </div>
    </div>
  );
};

export default CourseBuilder;
