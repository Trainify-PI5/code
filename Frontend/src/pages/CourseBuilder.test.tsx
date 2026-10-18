import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CourseBuilder from './CourseBuilder';
import { ToastProvider } from '../components/ui';
import api from '../services/api';

vi.mock('../services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } }));
vi.mock('../components/UploadMedia', () => ({ UploadMedia: () => <span>Upload</span> }));
vi.mock('../components/Course/AssessmentBuilder', () => ({ default: ({ lessonId }: { lessonId: string }) => <p>Editor do quiz {lessonId}</p> }));

async function createDraft(quiz = false) {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={['/courses/builder']}><ToastProvider><Routes><Route path="/courses/builder/:id?" element={<CourseBuilder />} /></Routes></ToastProvider></MemoryRouter>);
  await user.type(screen.getByPlaceholderText('Ex: Introdução à Programação'), 'Curso');
  await user.click(screen.getByRole('button', { name: 'Adicionar Novo Módulo' }));
  await user.type(screen.getByPlaceholderText('Módulo 1: Título do Módulo'), 'Módulo');
  await user.click(screen.getByRole('button', { name: 'Adicionar Lição' }));
  await user.type(screen.getByPlaceholderText('Título da Lição'), 'Aula 1');
  if (quiz) await user.selectOptions(screen.getByRole('combobox'), 'QUIZ');
  return user;
}

describe('Salvamento de cursos', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset(); vi.mocked(api.get).mockReset(); vi.mocked(api.put).mockReset();
    vi.mocked(api.put).mockResolvedValue({ data: {} });
  });
  it('reutiliza curso, módulo e aula já confirmados depois de uma falha parcial', async () => {
    let lessonCalls = 0;
    vi.mocked(api.post).mockImplementation(async (url) => {
      if (url === '/courses') return { data: { id: 'course' } };
      if (url.endsWith('/modules')) return { data: { id: 'module' } };
      lessonCalls++;
      if (lessonCalls === 2) throw new Error('falha simulada');
      return { data: { id: `lesson-${lessonCalls}` } };
    });
    vi.mocked(api.get).mockResolvedValue({ data: { title: 'Curso', modules: [] } });
    const user = await createDraft();
    await user.click(screen.getByRole('button', { name: 'Adicionar Lição' }));
    await user.type(screen.getAllByPlaceholderText('Título da Lição')[1], 'Aula 2');
    await user.click(screen.getByRole('button', { name: 'Salvar Rascunho' }));
    await screen.findByText(/Erro ao salvar curso/);
    await user.click(screen.getByRole('button', { name: 'Salvar Rascunho' }));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/lessons/lesson-1', expect.any(Object)));
    expect(vi.mocked(api.post).mock.calls.filter(([url]) => url === '/courses')).toHaveLength(1);
    expect(vi.mocked(api.post).mock.calls.filter(([url]) => url.endsWith('/modules'))).toHaveLength(1);
    await waitFor(() => expect(lessonCalls).toBe(3));
  });
  it('envia o tipo quiz e abre o editor após salvar e recarregar o curso', async () => {
    vi.mocked(api.post).mockImplementation(async (url) => ({ data: { id: url === '/courses' ? 'course' : url.endsWith('/modules') ? 'module' : 'quiz' } }));
    vi.mocked(api.get).mockResolvedValue({ data: { title: 'Curso', modules: [{ id: 'module', title: 'Módulo', lessons: [{ id: 'quiz', title: 'Aula 1', lessonType: 'QUIZ' }] }] } });
    const user = await createDraft(true);
    await user.click(screen.getByRole('button', { name: 'Salvar rascunho e montar quiz' }));
    expect(await screen.findByText('Editor do quiz quiz')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/modules/module/lessons', expect.objectContaining({ lessonType: 'QUIZ' }));
  });
});

/**
 * Um curso feito só de vídeo era invisível para o assistente: o indexador só lê
 * texto escrito, transcrição ou PDF, e não havia tela para escrever transcrição
 * nenhuma. O botão de atualizar também não existia, então ninguém descobria por
 * que a IA respondia que não tinha material.
 */
describe('Conteúdo que a IA consegue ler', () => {
  const cursoComVideo = {
    title: 'Integração',
    description: '',
    modules: [{
      id: 'module-1',
      title: 'Módulo 1',
      lessons: [{ id: 'lesson-1', title: 'Boas-vindas', lessonType: 'VIDEO', videoAssetId: 'media-1' }],
    }],
  };

  function abrirCurso() {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/courses/builder/course-1']}>
        <ToastProvider>
          <Routes><Route path="/courses/builder/:id?" element={<CourseBuilder />} /></Routes>
        </ToastProvider>
      </MemoryRouter>,
    );
    return user;
  }

  beforeEach(() => {
    vi.mocked(api.post).mockReset(); vi.mocked(api.get).mockReset(); vi.mocked(api.put).mockReset();
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/courses/course-1') return { data: cursoComVideo } as any;
      if (url === '/lessons/lesson-1/transcript') return { data: 'texto ja salvo' } as any;
      return { data: {} } as any;
    });
    vi.mocked(api.put).mockResolvedValue({ data: {} } as any);
  });

  it('salva a transcrição da aula em vídeo', async () => {
    const user = abrirCurso();

    await user.click(await screen.findByRole('button', { name: /Transcrição para a IA/ }));
    const campo = await screen.findByLabelText('Transcrição do vídeo');
    expect(campo).toHaveValue('texto ja salvo');

    await user.clear(campo);
    await user.type(campo, 'hoje falamos sobre seguranca');
    await user.click(screen.getByRole('button', { name: 'Salvar transcrição' }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith(
      '/lessons/lesson-1/transcript', { transcript: 'hoje falamos sobre seguranca' }));
  });

  it('trata aula sem transcrição como campo vazio, não como erro', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/courses/course-1') return { data: cursoComVideo } as any;
      // A API responde 404 enquanto não há transcrição
      if (url === '/lessons/lesson-1/transcript') throw { response: { status: 404 } };
      return { data: {} } as any;
    });

    const user = abrirCurso();
    await user.click(await screen.findByRole('button', { name: /Transcrição para a IA/ }));

    expect(await screen.findByLabelText('Transcrição do vídeo')).toHaveValue('');
  });

  it('avisa quando nenhuma aula tem texto que a IA consiga ler', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { indexadas: 0, total: 3 } } as any);
    const user = abrirCurso();

    await user.click(await screen.findByRole('button', { name: /Atualizar IA/ }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/ai/courses/course-1/reindex'));
    expect(await screen.findByText(/Nenhuma das aulas tem texto/)).toBeInTheDocument();
  });

  it('diz quantas aulas foram para a IA', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { indexadas: 2, total: 3 } } as any);
    const user = abrirCurso();

    await user.click(await screen.findByRole('button', { name: /Atualizar IA/ }));

    expect(await screen.findByText(/2 de 3 aula\(s\) enviada\(s\) para a IA/)).toBeInTheDocument();
  });

  it('não oferece atualizar a IA num curso que ainda nem foi salvo', async () => {
    render(
      <MemoryRouter initialEntries={['/courses/builder']}>
        <ToastProvider>
          <Routes><Route path="/courses/builder/:id?" element={<CourseBuilder />} /></Routes>
        </ToastProvider>
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button', { name: /Atualizar IA/ })).toBeNull();
  });
});
