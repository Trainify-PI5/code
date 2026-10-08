import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import Users from './Users';
import { ToastProvider } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

vi.mock('../services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ user: { id: 'admin', name: 'Admin', email: 'admin@example.com', role: 'ADMIN', department: '', tenantId: 'company-1' } });
  vi.mocked(api.get).mockResolvedValue({ data: [] });
});

function setup(path = '/users') {
  render(<MemoryRouter initialEntries={[path]}><ToastProvider><Users /></ToastProvider></MemoryRouter>);
  return userEvent.setup();
}

it('reúne os acessos e gera convite sem pedir senha inicial', async () => {
  vi.mocked(api.post).mockResolvedValue({ data: { invitationToken: 'a'.repeat(64) } });
  const user = setup();
  expect(screen.getByRole('tab', { name: 'Usuários' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.queryByRole('button', { name: 'Novo Usuário' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Convidar pessoa' }));
  expect(screen.getByRole('tab', { name: 'Convites' })).toHaveAttribute('aria-selected', 'true');
  await user.type(screen.getByLabelText('Nome'), 'Ana');
  await user.type(screen.getByLabelText('E-mail'), 'ana@example.com');
  await user.selectOptions(screen.getByLabelText('Perfil'), 'INSTRUCTOR');
  expect(screen.queryByLabelText('Senha Inicial')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Gerar convite' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/tenants/company-1/invitations?delivery=LINK', expect.objectContaining({ name: 'Ana', email: 'ana@example.com', role: 'INSTRUCTOR' })));
  await waitFor(() => expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument());
  await user.click(screen.getByRole('tab', { name: 'Usuários' }));
  expect(api.get).toHaveBeenCalledWith('/users');
});

it('separa convites pendentes do histórico e preserva sua validade', async () => {
  vi.mocked(api.get).mockImplementation(async url => ({ data: url === '/users' ? [] : [
    { id: '1', name: 'Pendente', email: 'pending@example.com', role: 'STUDENT', status: 'PENDING', expiresAt: '2027-01-01T12:00:00Z' },
    { id: '2', name: 'Concluído', email: 'accepted@example.com', role: 'STUDENT', status: 'ACCEPTED', expiresAt: '2027-01-01T12:00:00Z' },
  ] }));
  const user = setup('/users?tab=invitations');
  expect(await screen.findByRole('heading', { name: 'Pendente' })).toBeInTheDocument();
  expect(screen.getByText(/Validade:/)).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Concluído' })).not.toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Exibir'), 'history');
  expect(screen.getByRole('heading', { name: 'Concluído' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Revogar' })).not.toBeInTheDocument();
});

it('não libera convites para gestores por parâmetro de endereço', async () => {
  useAuthStore.setState({ user: { ...useAuthStore.getState().user!, role: 'MANAGER' } });
  setup('/users?tab=invitations');
  await waitFor(() => expect(api.get).toHaveBeenCalledWith('/users'));
  expect(screen.queryByRole('tab', { name: 'Convites' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Convidar pessoa' })).not.toBeInTheDocument();
  expect(api.get).not.toHaveBeenCalledWith('/tenants/company-1/invitations');
});
