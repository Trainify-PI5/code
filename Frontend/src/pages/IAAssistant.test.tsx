import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import IAAssistant from './IAAssistant';
import { ToastProvider } from '../components/ui';
import api from '../services/api';
vi.mock('../services/api', () => ({ default: { post: vi.fn() } }));
vi.mock('../contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
it('envia a pergunta no contrato esperado pelo backend e exibe a resposta', async () => {
  vi.mocked(api.post).mockResolvedValue({ data: { response: 'Resposta do servidor' } });
  const user = userEvent.setup();
  render(<ToastProvider><IAAssistant /></ToastProvider>);
  await user.type(screen.getByRole('textbox'), '  Minha pergunta  {Enter}');
  expect(await screen.findByText('Resposta do servidor')).toBeInTheDocument();
  // a saudacao inicial nao vai no historico
  expect(api.post).toHaveBeenCalledWith('/ia/chat', { query: 'Minha pergunta', history: [] }, { signal: expect.anything() });
});

it('envia as mensagens anteriores e mostra as aulas usadas como fonte', async () => {
  vi.mocked(api.post)
    .mockResolvedValueOnce({ data: { response: 'A NR-35 vale **acima de 2 m**.', sources: [
      { courseId: 'c1', lessonId: 'l1', lessonTitle: 'NR-35: Trabalho em altura' },
    ] } })
    .mockResolvedValueOnce({ data: { response: 'A organização.', sources: [] } });
  const user = userEvent.setup();
  render(<ToastProvider><IAAssistant /></ToastProvider>);

  await user.type(screen.getByRole('textbox'), 'Quando a NR-35 se aplica?{Enter}');
  expect(await screen.findByText('acima de 2 m')).toBeInTheDocument();
  expect(screen.getByText('NR-35: Trabalho em altura')).toBeInTheDocument();

  await user.type(screen.getByRole('textbox'), 'e quem garante a análise de risco?{Enter}');
  await screen.findByText('A organização.');
  expect(api.post).toHaveBeenLastCalledWith('/ia/chat', {
    query: 'e quem garante a análise de risco?',
    history: [
      { role: 'user', content: 'Quando a NR-35 se aplica?' },
      { role: 'assistant', content: 'A NR-35 vale **acima de 2 m**.' },
    ],
  }, { signal: expect.anything() });
});


it('descarta a resposta de uma conversa limpa durante a espera', async () => {
  let concluir!: (valor: { data: { response: string } }) => void;
  vi.mocked(api.post).mockImplementationOnce(() => new Promise(resolve => { concluir = resolve; }));
  const user = userEvent.setup();
  render(<ToastProvider><IAAssistant /></ToastProvider>);
  await user.type(screen.getByRole('textbox'), 'Pergunta antiga{Enter}');
  const sinal = vi.mocked(api.post).mock.lastCall?.[2]?.signal;
  await user.click(screen.getByRole('button', { name: 'Limpar conversa' }));
  await user.click(screen.getByRole('button', { name: /^Limpar$/ }));
  expect(sinal?.aborted).toBe(true);
  await act(async () => concluir({ data: { response: 'Resposta atrasada' } }));
  expect(screen.queryByText('Resposta atrasada')).not.toBeInTheDocument();
  expect(screen.queryByText('Pergunta antiga')).not.toBeInTheDocument();
});
