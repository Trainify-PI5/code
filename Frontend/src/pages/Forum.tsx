import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { Button, Card, Input, PageContainer, PageHeader, Textarea } from '../components/ui';

interface Thread { id: string; title: string; authorName: string; createdAt: string }
interface Post { id: string; content: string; authorName: string; createdAt: string }

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Data indisponível' : date.toLocaleString('pt-BR');
}

function Discussion({ thread, onBack }: { thread: Thread; onBack: () => void }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState('');
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [reload, setReload] = useState(0);
  const submitting = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    api.get(`/forums/threads/${thread.id}/posts`).then(({ data }) => {
      if (!cancelled) setPosts(data);
    }).catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [thread.id, reload]);

  async function sendReply(event: React.FormEvent) {
    event.preventDefault();
    if (!reply.trim() || submitting.current) return;
    submitting.current = true;
    setSending(true);
    setError('');
    try {
      const { data } = await api.post(`/forums/threads/${thread.id}/posts`, { content: reply.trim() });
      setPosts(current => [...current, data]);
      setReply('');
    } catch {
      setError('Não foi possível enviar a resposta. O texto foi mantido para você tentar novamente.');
    } finally { submitting.current = false; setSending(false); }
  }

  return <>
    <Button variant="ghost" onClick={onBack} disabled={sending}>Voltar às discussões</Button>
    <h2 className="break-words text-2xl font-display font-bold">{thread.title}</h2>
    {loading ? <p role="status">Carregando mensagens...</p> : loadError ?
      <div role="alert"><p>Não foi possível carregar as mensagens.</p><Button onClick={() => setReload(value => value + 1)}>Tentar novamente</Button></div> : <>
        {posts.length === 0 && <p>Nenhuma mensagem nesta discussão.</p>}
        {posts.map(post => <Card key={post.id}>
          <div className="flex flex-wrap gap-2 text-sm text-on-surface-variant"><strong>{post.authorName}</strong><span>{dateLabel(post.createdAt)}</span></div>
          <p className="mt-3 whitespace-pre-wrap break-words">{post.content}</p>
        </Card>)}
        <Card><form onSubmit={sendReply} className="space-y-4">
          <Textarea label="Sua resposta" value={reply} onChange={event => setReply(event.target.value)} disabled={sending} required rows={4} />
          {error && <p role="alert" className="text-red-600 dark:text-red-300">{error}</p>}
          <Button type="submit" disabled={sending || !reply.trim()}>{sending ? 'Enviando...' : 'Enviar resposta'}</Button>
        </form></Card>
      </>}
  </>;
}

export default function Forum() {
  const { id } = useParams<{ id: string }>();
  return <CourseForum key={id} courseId={id} />;
}

function CourseForum({ courseId }: { courseId?: string }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [selected, setSelected] = useState<Thread | null>(null);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(true);
  const [reload, setReload] = useState(0);
  const submitting = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    api.get(`/courses/${courseId}/forums/threads`, { params: { page, size: 20 } }).then(({ data }) => {
      if (!cancelled) { setThreads(data.content || []); setLast(data.last ?? true); }
    }).catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [courseId, page, reload]);

  async function createThread(event: React.FormEvent) {
    event.preventDefault();
    if (!newTitle.trim() || !newContent.trim() || submitting.current) return;
    submitting.current = true;
    setSending(true);
    setError('');
    try {
      const { data } = await api.post(`/courses/${courseId}/forums/threads`, { title: newTitle.trim(), content: newContent.trim() });
      setIsCreating(false);
      setNewTitle('');
      setNewContent('');
      setPage(0);
      setReload(value => value + 1);
      setSelected(data);
    } catch { setError('Não foi possível publicar a discussão. Seus dados foram mantidos.'); }
    finally { submitting.current = false; setSending(false); }
  }

  return <PageContainer>
    <PageHeader title="Fórum de Discussões" subtitle="Tire dúvidas e interaja com outros alunos e instrutores do curso."
      actions={!selected && <Button onClick={() => setIsCreating(true)}>Nova Discussão</Button>} />
    {selected ? <Discussion key={selected.id} thread={selected} onBack={() => setSelected(null)} /> : <>
      {isCreating && <Card><form onSubmit={createThread} className="space-y-4">
        <h2 className="text-lg font-semibold">Criar Nova Discussão</h2>
        <Input label="Título" value={newTitle} onChange={event => setNewTitle(event.target.value)} disabled={sending} required />
        <Textarea label="Detalhes (Conteúdo)" value={newContent} onChange={event => setNewContent(event.target.value)} disabled={sending} required />
        {error && <p role="alert" className="text-red-600 dark:text-red-300">{error}</p>}
        <div className="flex gap-3"><Button variant="ghost" disabled={sending} onClick={() => setIsCreating(false)}>Cancelar</Button><Button type="submit" disabled={sending || !newTitle.trim() || !newContent.trim()}>{sending ? 'Publicando...' : 'Publicar'}</Button></div>
      </form></Card>}
      {loading ? <p role="status">Carregando discussões...</p> : loadError ? <div role="alert"><p>Não foi possível carregar as discussões.</p><Button onClick={() => setReload(value => value + 1)}>Tentar novamente</Button></div> : <>
        {threads.length === 0 && <Card><p>Nenhuma discussão ainda.</p></Card>}
        {threads.map(thread => <Card key={thread.id}>
          <h2 className="break-words text-lg font-semibold">{thread.title}</h2>
          <p className="my-3 text-sm text-on-surface-variant">{thread.authorName} · {dateLabel(thread.createdAt)}</p>
          <Button variant="secondary" onClick={() => setSelected(thread)}>Ver discussão e responder</Button>
        </Card>)}
        <div className="flex items-center justify-between gap-3"><Button variant="ghost" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Anterior</Button><span>Página {page + 1}</span><Button variant="ghost" disabled={last} onClick={() => setPage(value => value + 1)}>Próxima</Button></div>
      </>}
    </>}
  </PageContainer>;
}
