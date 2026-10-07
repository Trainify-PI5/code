import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Companies from './Companies';
import { ToastProvider } from '../components/ui';
import api from '../services/api';

vi.mock('../services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockResolvedValue({ data: [] });
});
const show = () => render(<MemoryRouter initialEntries={[{ pathname: '/companies', state: { companyName: 'Cliente', adminName: 'Ana', adminEmail: 'ana@example.com' } }]}><ToastProvider><Companies /></ToastProvider></MemoryRouter>);

it('usa os dados comerciais apenas como preenchimento e cria a empresa após enviar o formulário', async () => {
  vi.mocked(api.post).mockResolvedValue({ data: { id: 'company-1', name: 'Cliente' } });
  show();
  expect(screen.getByLabelText('Nome da empresa')).toHaveValue('Cliente');
  expect(api.post).not.toHaveBeenCalled();
  const button = screen.getByRole('button', { name: 'Criar empresa e enviar convite' });
  await waitFor(() => expect(button).toBeEnabled());
  await userEvent.click(button);
  expect(await screen.findByText('Empresa criada e convite enviado ao administrador.')).toBeInTheDocument();
  expect(api.post).toHaveBeenCalledWith('/tenants', expect.objectContaining({ name: 'Cliente', adminName: 'Ana', adminEmail: 'ana@example.com', requestId: expect.any(String) }));
  expect(screen.getByLabelText('Empresa para gerenciar convites')).toHaveValue('company-1');
});

it('preserva o formulário e o identificador ao tentar novamente após uma falha', async () => {
  vi.mocked(api.post).mockRejectedValue(new Error('offline'));
  show();
  const button = screen.getByRole('button', { name: 'Criar empresa e enviar convite' });
  await waitFor(() => expect(button).toBeEnabled());
  await userEvent.click(button);
  await screen.findByText('Não foi possível concluir a criação. Verifique o serviço de e-mail e tente novamente.');
  expect(screen.getByLabelText('E-mail do administrador')).toHaveValue('ana@example.com');
  await userEvent.click(button);
  expect(api.post).toHaveBeenCalledTimes(2);
  expect(vi.mocked(api.post).mock.calls[0][1]).toEqual(vi.mocked(api.post).mock.calls[1][1]);
});

