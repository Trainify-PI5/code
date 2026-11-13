import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LessonPlayer from './LessonPlayer';
import api from '../services/api';

vi.mock('../services/api', () => ({ default: { get: vi.fn() } }));
vi.mock('../store/authStore', () => ({ useAuthStore: () => ({ user: { id: 'student' } }) }));
vi.mock('../hooks/useHeartbeat', () => ({
  useHeartbeat: () => ({ setWatchedSeconds: vi.fn(), setIsCompleted: vi.fn() }),
}));
vi.mock('../components/VideoPlayer', () => ({ VideoPlayer: () => null }));
vi.mock('../components/ui', async (importOriginal) => ({
  ...await importOriginal<typeof import('../components/ui')>(),
  useToast: () => ({ error: vi.fn(), info: vi.fn() }),
}));

const lessons = [
  { id: 'first', title: 'Introdução', lessonType: 'ARTICLE', content: 'Texto inicial' },
  { id: 'second', title: 'Prática', lessonType: 'ARTICLE', content: 'Texto da prática' },
  { id: 'third', title: 'Conclusão', lessonType: 'ARTICLE', content: 'Texto final' },
];

function renderPlayer() {
  render(<MemoryRouter initialEntries={['/courses/course/learn']}>
    <Routes><Route path="/courses/:id/learn" element={<LessonPlayer />} /></Routes>
  </MemoryRouter>);
}

async function openLessons() {
  const user = userEvent.setup();
  renderPlayer();
  const toggle = await screen.findByRole('button', { name: 'Conteúdo do curso' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await user.click(toggle);
  return { user, toggle, menu: within(screen.getByRole('region', { name: 'Conteúdo do curso' })) };
}

describe('Navegação de aulas', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/courses/course') return { data: { title: 'Curso', modules: [{ id: 'module', title: 'Módulo', lessons }] } };
      if (url === '/enrollments') return { data: [{ id: 'enrollment', course: { id: 'course' } }] };
      if (url === '/progress/enrollments/enrollment/lessons') return { data: [
        { lessonId: 'first', status: 'COMPLETED', locked: false },
        { lessonId: 'second', status: 'IN_PROGRESS', locked: false },
        { lessonId: 'third', status: 'NOT_STARTED', locked: true },
      ] };
      return { data: { watchedSeconds: 0 } };
    });
  });

  it('abre e fecha o conteúdo sem trocar a aula atual', async () => {
    const { user, toggle } = await openLessons();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('heading', { name: 'Prática' })).toBeInTheDocument();
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('heading', { name: 'Prática' })).toBeInTheDocument();
  });

  it('seleciona uma aula liberada e fecha o menu', async () => {
    const { user, toggle, menu } = await openLessons();
    await user.click(menu.getByRole('button', { name: /Introdução/ }));
    expect(screen.getByRole('heading', { name: 'Introdução' })).toBeInTheDocument();
    expect(screen.getByText('Texto inicial')).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(menu.getByRole('button', { name: /Introdução/ })).toHaveAttribute('aria-current', 'true');
  });

  it('mostra o progresso e impede selecionar uma aula bloqueada', async () => {
    const { user, toggle, menu } = await openLessons();
    expect(menu.getByText('33% concluído')).toBeInTheDocument();
    expect(menu.getByRole('button', { name: /Introdução/ })).toHaveTextContent('Concluída');
    const locked = menu.getByRole('button', { name: /Conclusão/ });
    expect(locked).toBeDisabled();
    await user.click(locked);
    expect(screen.getByRole('heading', { name: 'Prática' })).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it.each([
    [404, 'Curso não encontrado.'],
    [403, 'Você não tem acesso a este curso.'],
    [503, 'Não foi possível carregar o curso.'],
  ])('distingue a resposta %i ao abrir o curso', async (status, mensagem) => {
    vi.mocked(api.get).mockRejectedValueOnce({ isAxiosError: true, response: { status } });
    renderPlayer();
    expect(await screen.findByRole('alert')).toHaveTextContent(String(mensagem));
  });

  it.each(['falha', 'incompleto'])('não abre conteúdo com progresso %s e permite recuperar', async (modo) => {
    const get = vi.mocked(api.get);
    const normal = get.getMockImplementation()!;
    let primeira = true;
    get.mockImplementation(async (...args) => {
      if (primeira && args[0] === '/progress/enrollments/enrollment/lessons') {
        primeira = false;
        if (modo === 'falha') throw new Error('Sem conexão');
        return { data: [{ lessonId: 'first', locked: false }] };
      }
      return normal(...args);
    });
    renderPlayer();
    expect(await screen.findByRole('alert')).toHaveTextContent('quais aulas estão liberadas');
    expect(screen.queryByText('Texto inicial')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('heading', { name: 'Prática' })).toBeInTheDocument();
  });

  it('não interpreta falha na consulta de matrícula como prévia sem restrições', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { modules: [{ lessons }] } })
      .mockRejectedValueOnce(new Error('Sem conexão'));
    renderPlayer();
    expect(await screen.findByRole('alert')).toHaveTextContent('verificar sua matrícula');
    expect(screen.queryByText('Texto inicial')).not.toBeInTheDocument();
  });
});
