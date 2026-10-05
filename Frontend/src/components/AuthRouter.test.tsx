import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AuthRouter from './AuthRouter';

vi.mock('../pages/LandingPage', () => ({ default: ({ onGoToLogin }: any) => <button onClick={onGoToLogin}>Entrar</button> }));
vi.mock('../pages/auth/Login', () => ({ default: ({ onNavigate }: any) => <><h1>Login</h1><button onClick={() => onNavigate('forgot-password')}>Recuperar senha</button></> }));
vi.mock('../pages/auth/ForgotPassword', () => ({ default: ({ onNavigate }: any) => <><h1>Recuperação</h1><button onClick={() => onNavigate('login')}>Voltar ao login</button></> }));
vi.mock('../pages/auth/ResetPassword', () => ({ default: ({ token, onNavigate }: any) => <><h1>Redefinição</h1><span>Token: {token}</span><button onClick={() => onNavigate('login')}>Voltar ao login</button></> }));

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  return <>
    <output aria-label="URL">{location.pathname}{location.search}</output>
    <button onClick={() => navigate(-1)}>Anterior</button>
    <button onClick={() => navigate(1)}>Avançar</button>
  </>;
}

function openAt(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><AuthRouter /><Navigation /></MemoryRouter>);
}

describe('Rotas de autenticação', () => {
  it.each([
    ['/login', 'Login'],
    ['/forgot-password', 'Recuperação'],
    ['/reset-password?token=example', 'Redefinição'],
  ])('abre diretamente %s e preserva a tela ao remontar', async (path, title) => {
    const view = openAt(path);
    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByLabelText('URL')).toHaveTextContent(path);
    view.unmount();
    openAt(path);
    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
  });

  it('mantém a landing na raiz e atualiza a URL ao entrar', async () => {
    const user = userEvent.setup();
    openAt('/');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByLabelText('URL')).toHaveTextContent('/login');
  });

  it('acompanha voltar e avançar do navegador', async () => {
    const user = userEvent.setup();
    openAt('/login');
    await user.click(screen.getByRole('button', { name: 'Recuperar senha' }));
    expect(await screen.findByRole('heading', { name: 'Recuperação' })).toBeInTheDocument();
    expect(screen.getByLabelText('URL')).toHaveTextContent('/forgot-password');
    await user.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Avançar' }));
    expect(await screen.findByRole('heading', { name: 'Recuperação' })).toBeInTheDocument();
  });

  it('usa o token do link de redefinição e o remove ao retornar ao login', async () => {
    const user = userEvent.setup();
    openAt('/reset-password?token=example');
    expect(screen.getByText('Token: example')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voltar ao login' }));
    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByLabelText('URL').textContent).toBe('/login');
    await user.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(screen.getByLabelText('URL').textContent).toBe('/login');
  });

  it('encaminha uma rota protegida para o login quando não há sessão', async () => {
    openAt('/courses');
    await waitFor(() => expect(screen.getByLabelText('URL').textContent).toBe('/login'));
    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument();
  });
});
