import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AcceptInvitation from './AcceptInvitation';

const { post, session } = vi.hoisted(() => ({ post: vi.fn(), session: { isAuthenticated: false, logout: vi.fn() } }));
vi.mock('axios', () => ({ default: { create: () => ({ post }), isAxiosError: () => false } }));
vi.mock('../../store/authStore', () => ({ useAuthStore: () => session }));
beforeEach(() => { vi.clearAllMocks(); session.isAuthenticated = false; });
const show = (hash = '#token=' + 'a'.repeat(64)) => render(<MemoryRouter initialEntries={['/accept-invitation' + hash]}><AcceptInvitation /></MemoryRouter>);

it('ativa a conta apenas com o token e a senha, sem aceitar empresa ou perfil do navegador', async () => {
  post.mockResolvedValue({});
  show();
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Senha'), 'password123');
  await user.type(screen.getByLabelText('Confirmar senha'), 'password123');
  await user.click(screen.getByRole('button', { name: 'Ativar conta' }));
  expect(await screen.findByText('Conta ativada')).toBeInTheDocument();
  expect(post).toHaveBeenCalledWith('/auth/invitations/accept', { token: 'a'.repeat(64), password: 'password123' });
});

it('não envia formulário sem um token válido', () => {
  show('#token=invalid');
  expect(screen.getByText('Convite indisponível')).toBeInTheDocument();
  expect(post).not.toHaveBeenCalled();
});

it('pede saída da conta atual antes de aceitar outro convite', async () => {
  session.isAuthenticated = true;
  show();
  await userEvent.click(screen.getByRole('button', { name: 'Sair para aceitar convite' }));
  expect(session.logout).toHaveBeenCalled();
  expect(post).not.toHaveBeenCalled();
});

it('mantém o formulário disponível quando a ativação falha', async () => {
  post.mockRejectedValue(new Error('expired'));
  show();
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Senha'), 'password123');
  await user.type(screen.getByLabelText('Confirmar senha'), 'password123');
  await user.click(screen.getByRole('button', { name: 'Ativar conta' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível ativar sua conta.');
  expect(screen.queryByText('Conta ativada')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Ativar conta' })).toBeEnabled();
});

