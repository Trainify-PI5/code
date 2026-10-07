import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Forum from './Forum';
import api from '../services/api';

vi.mock('../services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
const thread = { id: 'thread', title: 'Dúvida da aula', authorName: 'Ana', createdAt: '2026-10-07T12:00:00Z' };
const post = { id: 'post', content: 'Como funciona?', authorName: 'Ana', createdAt: thread.createdAt };
function openForum() { render(<MemoryRouter initialEntries={['/courses/course/forum']}><Routes><Route path="/courses/:id/forum" element={<Forum />} /></Routes></MemoryRouter>); }

describe('Fórum', () => {
  beforeEach(() => { vi.mocked(api.get).mockReset(); vi.mocked(api.post).mockReset(); });
  it('abre as mensagens e publica uma resposta sem duplicar o envio', async () => {
    vi.mocked(api.get).mockImplementation(async url => ({ data: url.endsWith('/posts') ? [post] : { content: [thread], last: true } }));
    vi.mocked(api.post).mockResolvedValue({ data: { ...post, id: 'answer', content: 'Minha resposta' } });
    const user = userEvent.setup(); openForum();
    await user.click(await screen.findByRole('button', { name: 'Ver discussão e responder' }));
    expect(await screen.findByText('Como funciona?')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Sua resposta'), 'Minha resposta');
    await user.dblClick(screen.getByRole('button', { name: 'Enviar resposta' }));
    expect(await screen.findByText('Minha resposta')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/forums/threads/thread/posts', { content: 'Minha resposta' });
  });
  it('preserva a resposta quando o envio falha', async () => {
    vi.mocked(api.get).mockImplementation(async url => ({ data: url.endsWith('/posts') ? [post] : { content: [thread], last: true } }));
    vi.mocked(api.post).mockRejectedValue(new Error('offline'));
    const user = userEvent.setup(); openForum();
    await user.click(await screen.findByRole('button', { name: 'Ver discussão e responder' }));
    await user.type(await screen.findByLabelText('Sua resposta'), 'Resposta mantida');
    await user.click(screen.getByRole('button', { name: 'Enviar resposta' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('texto foi mantido');
    expect(screen.getByLabelText('Sua resposta')).toHaveValue('Resposta mantida');
  });
  it('distingue falha da API de lista vazia e permite tentar novamente', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: { content: [], last: true } });
    const user = userEvent.setup(); openForum();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar');
    expect(screen.queryByText('Nenhuma discussão ainda.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhuma discussão ainda.')).toBeInTheDocument();
  });
  it('cria uma discussão e abre sua mensagem inicial', async () => {
    vi.mocked(api.get).mockImplementation(async url => ({ data: url.endsWith('/posts') ? [post] : { content: [], last: true } }));
    vi.mocked(api.post).mockResolvedValue({ data: thread });
    const user = userEvent.setup(); openForum();
    await user.click(screen.getByRole('button', { name: 'Nova Discussão' }));
    await user.type(screen.getByLabelText('Título'), 'Dúvida da aula');
    await user.type(screen.getByLabelText('Detalhes (Conteúdo)'), 'Como funciona?');
    await user.click(screen.getByRole('button', { name: 'Publicar' }));
    expect(await screen.findByText('Como funciona?')).toBeInTheDocument();
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
  });
});
