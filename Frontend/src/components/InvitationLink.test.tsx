import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import InvitationLink from './InvitationLink';

it('copia um link do próprio site com o token no fragmento', async () => {
  const user = userEvent.setup();
  const copy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  render(<InvitationLink invitationToken={'a'.repeat(64)} email="ana@example.com" />);
  await user.click(screen.getByRole('button', { name: 'Copiar convite' }));
  expect(copy).toHaveBeenCalledWith(window.location.origin + '/accept-invitation#token=' + 'a'.repeat(64));
  expect(await screen.findByRole('status')).toHaveTextContent('Link copiado.');
});

it('permite selecionar o link quando o navegador bloqueia a cópia', async () => {
  const user = userEvent.setup();
  vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
  render(<InvitationLink invitationToken={'b'.repeat(64)} email="ana@example.com" />);
  await user.click(screen.getByRole('button', { name: 'Copiar convite' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Selecione o campo');
  expect(screen.getByLabelText('Link para compartilhar')).toHaveValue(window.location.origin + '/accept-invitation#token=' + 'b'.repeat(64));
});
