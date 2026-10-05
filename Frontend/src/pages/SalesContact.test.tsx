import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SalesContact from './SalesContact';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('axios', () => ({ default: { create: () => ({ post }), isAxiosError: (err: any) => !!err.response } }));

async function fillForm() {
  const user = userEvent.setup();
  render(<MemoryRouter><SalesContact /></MemoryRouter>);
  await user.type(screen.getByLabelText('Nome *'), 'Ana');
  await user.type(screen.getByLabelText('Sobrenome *'), 'Silva');
  await user.type(screen.getByLabelText('E-mail de trabalho *'), 'ana@example.com');
  await user.type(screen.getByLabelText('Telefone com código do país *'), '+55 11 99999-9999');
  await user.type(screen.getByLabelText('Empresa *'), 'Empresa');
  await user.type(screen.getByLabelText('Cargo *'), 'Diretora');
  await user.selectOptions(screen.getByLabelText('Número de funcionários *'), '11-50');
  await user.click(screen.getByRole('checkbox'));
  return user;
}

describe('Solicitação comercial', () => {
  beforeEach(() => { post.mockReset(); });
  it('envia dados normalizados e só confirma após a resposta do servidor', async () => {
    post.mockResolvedValue({ status: 201, data: { id: 'protocolo-do-servidor' } });
    const user = await fillForm();
    await user.click(screen.getByRole('button', { name: 'Solicitar demonstração' }));
    expect(await screen.findByText('Solicitação recebida!')).toBeInTheDocument();
    expect(screen.getByText('protocolo-do-servidor')).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith('/public/sales-requests', expect.objectContaining({ firstName: 'Ana', phone: '+5511999999999', consent: true, companySize: '11-50' }));
  });
  it('preserva os dados e reutiliza o protocolo ao tentar novamente após falha', async () => {
    post.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ status: 201, data: { id: 'receipt' } });
    const user = await fillForm();
    await user.click(screen.getByRole('button', { name: 'Solicitar demonstração' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível confirmar');
    expect(screen.getByLabelText('Empresa *')).toHaveValue('Empresa');
    expect(screen.queryByText('Solicitação recebida!')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Solicitar demonstração' }));
    await screen.findByText('Solicitação recebida!');
    expect(post.mock.calls[0][1].id).toBe(post.mock.calls[1][1].id);
  });
  it('exige consentimento e valida telefone antes de enviar', async () => {
    const user = await fillForm();
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Solicitar demonstração' }));
    expect(post).not.toHaveBeenCalled();
    await user.click(screen.getByRole('checkbox'));
    await user.clear(screen.getByLabelText('Telefone com código do país *'));
    await user.type(screen.getByLabelText('Telefone com código do país *'), '123');
    await user.click(screen.getByRole('button', { name: 'Solicitar demonstração' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('telefone válido');
    expect(post).not.toHaveBeenCalled();
  });
  it('impede envios repetidos enquanto aguarda e informa limite de tentativas', async () => {
    let reject!: (reason: unknown) => void;
    post.mockImplementation(() => new Promise((_, fail) => { reject = fail; }));
    const user = await fillForm();
    await user.dblClick(screen.getByRole('button', { name: 'Solicitar demonstração' }));
    expect(post).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Enviando solicitação...' })).toBeDisabled();
    reject({ response: { status: 429 } });
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Aguarde um minuto'));
  });
});
