import { render, screen } from '@testing-library/react';
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
  expect(api.post).toHaveBeenCalledWith('/ia/chat', { query: 'Minha pergunta' });
});
