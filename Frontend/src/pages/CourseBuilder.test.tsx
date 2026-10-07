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
