import { useState } from 'react';

export interface GeneratedInvitationLink { invitationToken: string; email: string; }

export default function InvitationLink({ invitationToken, email }: GeneratedInvitationLink) {
  const [status, setStatus] = useState('');
  const url = new URL('/accept-invitation', window.location.origin);
  url.hash = new URLSearchParams({ token: invitationToken }).toString();
  async function copy() {
    try {
      await navigator.clipboard.writeText(url.href);
      setStatus('Link copiado.');
    } catch {
      setStatus('Não foi possível copiar automaticamente. Selecione o campo abaixo e copie o link.');
    }
  }
  return <section aria-label="Link do convite" className="my-5 space-y-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
    <h2 className="font-bold">Convite para {email}</h2>
    <p className="text-sm text-on-surface-variant">Envie este link somente ao destinatário. Ele permite definir a senha da conta, vale por 48 horas e pode ser usado uma única vez. Nenhum e-mail foi enviado.</p>
    <label className="block text-sm">Link para compartilhar<input readOnly value={url.href} onFocus={event => event.target.select()} className="mt-2 w-full rounded-lg border border-outline-variant bg-surface-bright p-3 text-on-surface" /></label>
    <button type="button" onClick={copy} className="rounded-lg bg-primary-container px-4 py-2 font-bold text-white">Copiar convite</button>
    <p className="text-sm text-on-surface-variant">Copie antes de sair desta tela. Se precisar de outro link depois, use “Gerar novo link”; o anterior deixará de funcionar.</p>
    {status && <p role="status" className="text-sm">{status}</p>}
  </section>;
}
