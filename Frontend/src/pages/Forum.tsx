import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { MessageSquare, Plus, User, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button, Card, Input, Textarea } from '../components/ui';

export default function Forum() {
  const { id } = useParams<{ id: string }>();
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  useEffect(() => {
    fetchThreads();
  }, [id]);

  const fetchThreads = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/courses/${id}/forums/threads`);
      setThreads(res.data.content || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateThread = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    try {
      await api.post(`/courses/${id}/forums/threads`, {
        title: newTitle,
        content: newContent
      });
      setIsCreating(false);
      setNewTitle('');
      setNewContent('');
      fetchThreads();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-on-surface">
            Fórum de Discussões
          </h1>
          <p className="text-on-surface-variant mt-1">
            Tire dúvidas e interaja com outros alunos e instrutores do curso.
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-5 h-5" />
          Nova Discussão
        </Button>
      </div>

      {isCreating && (
        <Card className="space-y-4">
          <h2 className="text-lg font-display font-semibold text-on-surface">
            Criar Nova Discussão
          </h2>
          <Input
            label="Título"
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Qual a sua dúvida principal?"
          />
          <Textarea
            label="Detalhes (Conteúdo)"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Explique com mais detalhes a sua dúvida ou tópico de discussão..."
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsCreating(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateThread}
              disabled={!newTitle.trim() || !newContent.trim()}
            >
              Publicar
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12 text-on-surface-variant">
          Carregando discussões...
        </div>
      ) : threads.length === 0 ? (
        <Card padding="none" className="p-12 text-center">
          <MessageSquare className="w-12 h-12 text-outline-variant mx-auto mb-4" />
          <h3 className="text-lg font-medium text-on-surface mb-1">
            Nenhuma discussão ainda
          </h3>
          <p className="text-on-surface-variant">
            Seja o primeiro a iniciar um tópico neste fórum!
          </p>
        </Card>
      ) : (
        <Card padding="none" className="divide-y divide-outline-variant">
          {threads.map((thread) => (
            <div
              key={thread.id}
              className="p-6 hover:bg-surface-container-low transition-colors cursor-pointer group"
            >
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-on-surface group-hover:text-primary transition-colors line-clamp-1">
                    {thread.title}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-on-surface-variant">
                    <span className="font-medium text-on-surface">{thread.authorName}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true, locale: ptBR })}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      Responder
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
