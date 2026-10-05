import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Home from './Home';
import Profile from './Profile';
import Certifications from './Certifications';
import api from '../services/api';

vi.mock('../services/api', () => ({ default: { get: vi.fn() } }));
vi.mock('../store/authStore', () => ({ useAuthStore: () => ({ user: { name: 'Aluno', email: 'aluno@example.com', role: 'ADMIN' } }) }));
vi.mock('../contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
vi.mock('../components/ui', async (importOriginal) => ({
  ...await importOriginal<typeof import('../components/ui')>(),
  useToast: () => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }),
}));

describe('Dados reais nas páginas', () => {
  beforeEach(() => { vi.mocked(api.get).mockReset(); });

  it('exibe cursos e atividades da API sem métricas inventadas', async () => {
    vi.mocked(api.get).mockImplementation(async (url) => ({ data: url === '/courses'
      ? [{ id: 'course', title: 'Curso da API', description: 'Descrição real' }]
      : [{ id: 'notification', title: 'Aviso da API', message: 'Mensagem real', createdAt: '2026-10-05T12:00:00Z' }] }));
    render(<MemoryRouter><Home /></MemoryRouter>);
    expect(await screen.findByText('Curso da API')).toBeInTheDocument();
    expect(screen.getByText(/Aviso da API/)).toBeInTheDocument();
    expect(screen.queryByText('68%')).not.toBeInTheDocument();
    expect(screen.queryByText('3,492')).not.toBeInTheDocument();
    expect(screen.queryByText('2h 00m')).not.toBeInTheDocument();
  });

  it('usa o curso e a data de conclusão da matrícula sem criar notas ou horas', async () => {
    vi.mocked(api.get).mockImplementation(async (url) => ({ data: url === '/enrollments'
      ? [{ id: 'enrollment', status: 'COMPLETED', course: { title: 'Curso concluído da API' }, completedAt: null }]
      : [] }));
    render(<Profile />);
    expect(await screen.findByText('Curso concluído da API')).toBeInTheDocument();
    expect(screen.getByText('Data indisponível')).toBeInTheDocument();
    expect(screen.queryByText('Top Aluno')).not.toBeInTheDocument();
    expect(screen.queryByText('100%')).not.toBeInTheDocument();
    expect(screen.queryByText('4h')).not.toBeInTheDocument();
  });

  it('lista certificados sem atribuir nota ou carga horária', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [{ id: 'cert', courseTitle: 'Certificado da API', score: 100 }] });
    render(<Certifications />);
    expect(await screen.findByText('Certificado da API')).toBeInTheDocument();
    expect(screen.queryByText('100%')).not.toBeInTheDocument();
    expect(screen.queryByText('4h')).not.toBeInTheDocument();
    expect(screen.queryByText('Conhecimento Geral')).not.toBeInTheDocument();
  });

  it.each([Home, Profile, Certifications])('mostra erro quando a API falha', async (Page) => {
    vi.mocked(api.get).mockRejectedValue(new Error('offline'));
    render(<MemoryRouter><Page /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar');
  });

  it('mostra estado vazio quando não há certificados', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    render(<Certifications />);
    expect(await screen.findByText('Nenhum certificado disponível.')).toBeInTheDocument();
  });
});
