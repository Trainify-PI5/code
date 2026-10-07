import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import CompanyInvitations from './CompanyInvitations';
import { ToastProvider } from './ui';
import api from '../services/api';

vi.mock('../services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
beforeEach(() => { vi.clearAllMocks(); vi.mocked(api.get).mockResolvedValue({ data: [] }); });

it('envia o convite para a empresa selecionada sem permitir perfil supremo', async () => {
  vi.mocked(api.post).mockResolvedValue({});
  render(<ToastProvider><CompanyInvitations tenantId="company-1" /></ToastProvider>);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Nome'), 'Ana');
  await user.type(screen.getByLabelText('E-mail'), 'ana@example.com');
  expect(screen.queryByRole('option', { name: /supremo/i })).not.toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Perfil'), 'MANAGER');
  await user.click(screen.getByRole('button', { name: 'Enviar convite' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/tenants/company-1/invitations', expect.objectContaining({ name: 'Ana', email: 'ana@example.com', role: 'MANAGER' })));
});

it('permite reenviar um convite expirado sem criar outro', async () => {
  vi.mocked(api.get).mockResolvedValue({ data: [{ id: 'invite-1', name: 'Ana', email: 'ana@example.com', role: 'ADMIN', status: 'EXPIRED', expiresAt: '2026-01-01T00:00:00Z' }] });
  vi.mocked(api.post).mockResolvedValue({});
  render(<ToastProvider><CompanyInvitations tenantId="company-1" /></ToastProvider>);
  await userEvent.click(await screen.findByRole('button', { name: 'Reenviar' }));
  expect(api.post).toHaveBeenCalledWith('/tenants/company-1/invitations/invite-1/resend');
});

it('não apresenta lista vazia quando o carregamento falha', async () => {
  vi.mocked(api.get).mockRejectedValue(new Error('offline'));
  render(<ToastProvider><CompanyInvitations tenantId="company-1" /></ToastProvider>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os convites.');
  expect(screen.queryByText('Nenhum convite enviado para esta empresa.')).not.toBeInTheDocument();
});
