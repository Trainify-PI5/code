import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AIChatWidget from './AIChatWidget';
import { useAuthStore } from '../store/authStore';
import { useAulaAbertaStore } from '../store/aulaAbertaStore';
import { perguntarAssistente } from '../lib/iaChat';

vi.mock('../lib/iaChat', async (original) => ({
  ...(await original<typeof import('../lib/iaChat')>()),
  perguntarAssistente: vi.fn(),
}));

const perguntar = vi.mocked(perguntarAssistente);

// O jsdom não implementa captura de ponteiro, usada para arrastar o balão
HTMLElement.prototype.setPointerCapture ??= () => {};
HTMLElement.prototype.releasePointerCapture ??= () => {};

beforeEach(() => {
  perguntar.mockReset();
  perguntar.mockResolvedValue({ response: 'Um ano, com uma reeleição.', sources: [] });
  useAuthStore.setState({
    user: { id: '1', name: 'Aluno', email: 'aluno@example.com', role: 'STUDENT', department: '' },
  });
  useAulaAbertaStore.setState({ aula: null });
});

async function perguntarNoBalao(texto: string) {
  const user = userEvent.setup();
  render(<AIChatWidget />);
  await user.click(screen.getByRole('button', { name: 'Abrir assistente Trainify' }));
  await user.type(screen.getByRole('textbox'), texto);
  await user.click(screen.getByRole('button', { name: 'Enviar pergunta' }));
  await screen.findByText('Um ano, com uma reeleição.');
}

it('com uma aula aberta, mostra qual é e manda a aula junto com a pergunta', async () => {
  useAulaAbertaStore.setState({ aula: { lessonId: 'nr5', courseId: 'nrs', titulo: 'NR-5: CIPA' } });

  await perguntarNoBalao('Qual a duração do mandato?');

  expect(screen.getByText('NR-5: CIPA')).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Pergunte sobre esta aula' })).toBeInTheDocument();
  expect(perguntar).toHaveBeenCalledWith('Qual a duração do mandato?', [], { lessonId: 'nr5', courseId: 'nrs' });
});

it('fora de uma aula, pergunta sem contexto de aula', async () => {
  await perguntarNoBalao('Quais cursos eu tenho?');

  expect(screen.queryByText(/Sobre a aula/)).not.toBeInTheDocument();
  expect(perguntar).toHaveBeenCalledWith('Quais cursos eu tenho?', [], {});
});
