import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SalesRequests from './SalesRequests';
import api from '../services/api';

vi.mock('../services/api', () => ({ default: { get: vi.fn(), patch: vi.fn() } }));
const lead = { id: 'lead', firstName: 'Ana', lastName: 'Silva', company: 'Empresa', email: 'ana@example.com', phone: '+5511999999999', jobTitle: 'Diretora', companySize: '11-50', status: 'NEW', createdAt: '2026-10-05T12:00:00Z' };

describe('Atendimento comercial', () => {
  beforeEach(() => { vi.mocked(api.get).mockReset(); vi.mocked(api.patch).mockReset(); });
  it('carrega solicitações e persiste o status', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { items: [lead], total: 1 } });
    vi.mocked(api.patch).mockResolvedValue({ status: 204 });
    const user = userEvent.setup();
    render(<MemoryRouter><SalesRequests /></MemoryRouter>);
    await screen.findByText('Empresa');
    await user.selectOptions(screen.getByLabelText('Atendimento de Empresa'), 'CONTACTED');
    await waitFor(() => expect(screen.queryByText('Empresa')).not.toBeInTheDocument());
    await user.click(screen.getByRole('tab', { name: /Em contato/ }));
    expect(screen.getByLabelText('Atendimento de Empresa')).toHaveValue('CONTACTED');
    expect(api.patch).toHaveBeenCalledWith('/sales-requests/lead/status', { status: 'CONTACTED' });
  });
  it('não altera o status na tela se a gravação falhar', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { items: [lead], total: 1 } });
    vi.mocked(api.patch).mockRejectedValue(new Error('offline'));
    const user = userEvent.setup();
    render(<MemoryRouter><SalesRequests /></MemoryRouter>);
    await screen.findByText('Empresa');
    await user.selectOptions(screen.getByLabelText('Atendimento de Empresa'), 'CLOSED');
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível atualizar');
    expect(screen.getByLabelText('Atendimento de Empresa')).toHaveValue('NEW');
  });
  it('diferencia falha de carregamento de lista vazia e permite tentar novamente', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: { items: [], total: 0 } });
    const user = userEvent.setup();
    render(<MemoryRouter><SalesRequests /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar');
    expect(screen.queryByText('Nenhuma nova solicitação.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Atualizar' }));
    expect(await screen.findByText('Nenhuma nova solicitação.')).toBeInTheDocument();
  });

  it('move a solicitação encerrada para a aba de encerradas e permite reabrir', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { items: [lead], total: 1 } });
    vi.mocked(api.patch).mockResolvedValue({ status: 204 });
    const user = userEvent.setup();
    render(<MemoryRouter><SalesRequests /></MemoryRouter>);
    await screen.findByText('Empresa');
    await user.selectOptions(screen.getByLabelText('Atendimento de Empresa'), 'CLOSED');
    await waitFor(() => expect(screen.queryByText('Empresa')).not.toBeInTheDocument());
    await user.click(screen.getByRole('tab', { name: /Solicitações encerradas/ }));
    expect(screen.getByLabelText('Atendimento de Empresa')).toHaveValue('CLOSED');
    await user.selectOptions(screen.getByLabelText('Atendimento de Empresa'), 'CONTACTED');
    await waitFor(() => expect(screen.queryByText('Empresa')).not.toBeInTheDocument());
    await user.click(screen.getByRole('tab', { name: /Em contato/ }));
    expect(screen.getByLabelText('Atendimento de Empresa')).toHaveValue('CONTACTED');
  });

  it('inclui solicitações de outras páginas da API e pagina cada aba separadamente', async () => {
    const closed = Array.from({ length: 20 }, (_, index) => ({ ...lead, id: 'closed-' + index, company: 'Encerrada ' + index, status: 'CLOSED' }));
    vi.mocked(api.get).mockResolvedValueOnce({ data: { items: closed, total: 22 } })
      .mockResolvedValueOnce({ data: { items: [{ ...lead, id: 'last', company: 'Última encerrada', status: 'CLOSED' }, lead], total: 22 } });
    const user = userEvent.setup();
    render(<MemoryRouter><SalesRequests /></MemoryRouter>);
    await screen.findByText('Empresa');
    expect(api.get).toHaveBeenCalledWith('/sales-requests', expect.objectContaining({ params: { page: 1 } }));
    await user.click(screen.getByRole('tab', { name: /Solicitações encerradas/ }));
    expect(screen.getAllByRole('article')).toHaveLength(20);
    await user.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(screen.getByText('Última encerrada')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Novas solicitações/ }));
    expect(screen.getByText('Página 1')).toBeInTheDocument();
    expect(screen.getByText('Empresa')).toBeInTheDocument();
  });

  it('permite navegar pelas abas com as setas do teclado', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { items: [], total: 0 } });
    const user = userEvent.setup();
    render(<MemoryRouter><SalesRequests /></MemoryRouter>);
    await screen.findByText('Nenhuma nova solicitação.');
    screen.getByRole('tab', { name: /Novas solicitações/ }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /Em contato/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Nenhuma solicitação em contato.')).toBeInTheDocument();
  });
});
