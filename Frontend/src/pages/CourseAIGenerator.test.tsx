import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import CourseAIGenerator from './CourseAIGenerator';
import { ToastProvider } from '../components/ui';
import api from '../services/api';

vi.mock('../services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));

const proposta = {
  title: 'Segurança no trabalho',
  description: 'Curso sobre EPI.',
  warnings: [],
  modules: [{
    title: 'Proteção individual',
    objective: 'Usar o EPI.',
    lessons: [
      { title: 'Fornecimento do EPI', content: '## Quem fornece\nA **organização** fornece.', sources: [{ document: 'manual.pdf', pages: '2-5' }] },
      { title: 'Guarda do EPI', content: 'Guardar em local limpo.', sources: [] },
    ],
  }],
};

function abrir(endereco: string) {
  return render(
    <MemoryRouter initialEntries={[endereco]}>
      <ToastProvider>
        <Routes>
          <Route path="/courses/ai" element={<CourseAIGenerator />} />
          <Route path="/courses/builder/:id" element={<p>Editor do curso</p>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => vi.resetAllMocks());

it('envia os documentos com a orientação e o tamanho escolhidos e mostra o andamento', async () => {
  vi.mocked(api.post).mockResolvedValue({ data: { id: 'r1', status: 'PROCESSING', progress: 0 } });
  vi.mocked(api.get).mockResolvedValue({
    data: { id: 'r1', status: 'PROCESSING', progress: 40, step: 'Escrevendo a aula 2 de 5', documentNames: ['manual.pdf'] },
  });
  const user = userEvent.setup();
  abrir('/courses/ai');

  await user.upload(screen.getByLabelText('Documentos do curso'), new File(['%PDF-1.4'], 'manual.pdf', { type: 'application/pdf' }));
  expect(screen.getByRole('list', { name: 'Documentos escolhidos' })).toHaveTextContent('manual.pdf');
  await user.type(screen.getByLabelText('Orientação para a IA (opcional)'), 'Foco em armazém');
  await user.click(screen.getByRole('button', { name: /Gerar proposta de curso/ }));

  const [url, form] = vi.mocked(api.post).mock.calls[0] as [string, FormData];
  expect(url).toBe('/ai/course-drafts');
  expect((form.get('files') as File).name).toBe('manual.pdf');
  expect(form.get('instructions')).toBe('Foco em armazém');
  expect(form.get('minModules')).toBe('2');
  expect(form.get('maxModules')).toBe('4');

  expect(await screen.findByText('Escrevendo a aula 2 de 5')).toBeInTheDocument();
  expect(screen.getByRole('progressbar', { name: 'Andamento da geração' })).toHaveAttribute('aria-valuenow', '40');
});

it('o botão de gerar só libera com documento escolhido', () => {
  abrir('/courses/ai');
  expect(screen.getByRole('button', { name: /Gerar proposta de curso/ })).toBeDisabled();
});

it('revisa, edita e cria o curso em rascunho', async () => {
  vi.mocked(api.get).mockResolvedValue({ data: { id: 'r1', status: 'READY', progress: 100, proposal: proposta } });
  vi.mocked(api.put).mockResolvedValue({ data: {} });
  vi.mocked(api.post).mockResolvedValue({ data: { id: 'r1', status: 'APPROVED', courseId: 'c1' } });
  const user = userEvent.setup();
  abrir('/courses/ai?rascunho=r1');

  const titulo = await screen.findByLabelText('Título do curso');
  await user.clear(titulo);
  await user.type(titulo, 'Segurança para operadores');
  expect(screen.getByText('Fontes: manual.pdf (p. 2-5)')).toBeInTheDocument();

  // a aula abre já formatada
  await user.click(screen.getAllByRole('button', { name: 'Ver texto' })[0]);
  expect(screen.getByText('organização').tagName).toBe('STRONG');

  await user.click(screen.getByRole('button', { name: 'Remover a aula Guarda do EPI' }));
  await user.click(screen.getByRole('button', { name: /Criar curso em rascunho/ }));

  await waitFor(() => expect(api.put).toHaveBeenCalled());
  const [url, enviada] = vi.mocked(api.put).mock.calls[0] as [string, typeof proposta];
  expect(url).toBe('/ai/course-drafts/r1/proposal');
  expect(enviada.title).toBe('Segurança para operadores');
  expect(enviada.modules[0].lessons.map((a) => a.title)).toEqual(['Fornecimento do EPI']);
  expect(api.post).toHaveBeenCalledWith('/ai/course-drafts/r1/approve');
  expect(await screen.findByText('Editor do curso')).toBeInTheDocument();
});

it('mostra o motivo quando a geração falha', async () => {
  vi.mocked(api.get).mockResolvedValue({
    data: { id: 'r1', status: 'FAILED', progress: 10, error: 'Nenhum dos documentos tem texto aproveitável.' },
  });
  abrir('/courses/ai?rascunho=r1');
  expect(await screen.findByText('Nenhum dos documentos tem texto aproveitável.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Enviar documentos de novo' })).toBeInTheDocument();
});
