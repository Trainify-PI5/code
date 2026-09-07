import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen, Play, CheckCircle, Clock, Video, FileText, ChevronDown } from 'lucide-react';
import api from '../services/api';

interface Lesson {
  id: string;
  title: string;
  lessonType: string;
}

interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  instructor: { name: string; avatar?: string };
  modules: Module[];
}

export const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await api.get(`/courses/${id}`);
        setCourse(response.data);
      } catch (err) {
        console.error('Erro ao buscar curso', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [id]);

  const handleEnroll = async () => {
    try {
      setEnrolling(true);
      await api.post(`/courses/${id}/enroll`);
      alert('Matrícula realizada com sucesso!');
      navigate('/content');
    } catch (err: any) {
      if (err.response?.status === 409) {
        alert('Você já está matriculado neste curso!');
        navigate('/content');
      } else {
        alert('Erro ao realizar matrícula.');
      }
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (!course) {
    return <div className="text-center p-8">Curso não encontrado.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 sm:p-8 animate-in fade-in duration-500">
      <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-sm border border-outline-variant">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-on-surface mb-4">{course.title}</h1>
        <p className="text-base sm:text-lg text-on-surface-variant mb-8 leading-relaxed">
          {course.description}
        </p>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8 p-4 bg-surface-container rounded-xl border border-outline-variant/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-white font-bold overflow-hidden shrink-0">
              {course.instructor?.avatar ? (
                <img src={course.instructor.avatar} alt="Instrutor" className="w-full h-full object-cover" />
              ) : (
                course.instructor?.name?.charAt(0) || 'I'
              )}
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">Instrutor</p>
              <p className="font-medium text-on-surface">{course.instructor?.name || 'Não informado'}</p>
            </div>
          </div>
        </div>

        <button 
          onClick={handleEnroll}
          disabled={enrolling}
          className="w-full sm:w-auto px-8 py-4 bg-primary-container text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 text-base sm:text-lg active:scale-95"
        >
          {enrolling ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : <Play className="w-5 h-5 fill-current" />}
          Matricular-se Agora
        </button>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-on-surface flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          Conteúdo do Curso
        </h2>
        
        <div className="space-y-4">
          {course.modules.map((mod, idx) => (
            <div key={mod.id} className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden">
              <div className="p-4 bg-surface-container/50 border-b border-outline-variant flex justify-between items-center cursor-pointer hover:bg-surface-container transition-colors">
                <div>
                  <h3 className="font-bold text-on-surface">Módulo {idx + 1}: {mod.title}</h3>
                  {mod.description && <p className="text-sm text-on-surface-variant mt-1">{mod.description}</p>}
                </div>
                <ChevronDown className="w-5 h-5 text-on-surface-variant shrink-0 ml-4" />
              </div>
              <div className="divide-y divide-outline-variant/50">
                {mod.lessons.map(less => (
                  <div key={less.id} className="p-4 flex items-center gap-3 hover:bg-surface-bright transition-colors">
                    {less.lessonType === 'VIDEO' ? <Video className="w-4 h-4 text-on-surface-variant shrink-0" /> : <FileText className="w-4 h-4 text-on-surface-variant shrink-0" />}
                    <span className="text-on-surface font-medium">{less.title}</span>
                  </div>
                ))}
                {mod.lessons.length === 0 && (
                  <div className="p-4 text-on-surface-variant text-sm">Nenhuma lição cadastrada.</div>
                )}
              </div>
            </div>
          ))}
          {course.modules.length === 0 && (
             <div className="text-center p-8 bg-surface-container rounded-xl text-on-surface-variant">Nenhum módulo cadastrado.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
