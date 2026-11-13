import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import Login from './Login';

vi.mock('../../config', async (original) => ({
  ...(await original<typeof import('../../config')>()), RECAPTCHA_SITE_KEY: 'teste',
}));
vi.mock('../../components/Recaptcha', () => ({
  default: ({ onChange }: { onChange: (token: string) => void }) => (
    <button type="button" onClick={() => onChange(crypto.randomUUID())}>Verificar</button>
  ),
}));

it('exige uma nova confirmação antes de enviar a empresa escolhida', async () => {
  const mock = new MockAdapter(api);
  mock.onPost('/auth/login').reply(409, {
    type: 'urn:problem-type:tenant-selection-required', tenants: [{ id: 'beta', name: 'Beta Log' }],
  });
  try {
    const user = userEvent.setup();
    render(<Login onNavigate={() => {}} />);
    await user.type(screen.getByLabelText('E-mail'), 'teste@example.com');
    await user.type(screen.getByLabelText(/^Senha$/), 'senha-teste');
    await user.click(screen.getByRole('button', { name: 'Verificar' }));
    await user.click(screen.getByRole('button', { name: /entrar na plataforma/i }));
    const empresa = await screen.findByRole('button', { name: 'Beta Log' });
    expect(empresa).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Verificar' }));
    await user.click(empresa);
    const [primeiro, segundo] = mock.history.post.map(req => JSON.parse(req.data));
    expect(segundo.tenantId).toBe('beta');
    expect(segundo.recaptchaToken).toBeTruthy();
    expect(segundo.recaptchaToken).not.toEqual(primeiro.recaptchaToken);
  } finally {
    mock.restore();
    useAuthStore.getState().clearTenantOptions();
  }
});
