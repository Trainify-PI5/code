import { useEffect, useRef, useState, type FormEvent } from 'react';
import api from '../services/api';
import { ConfirmDialog, useToast } from './ui';
import { requestError } from '../lib/requestError';

interface Invitation {
  id: string; name: string; email: string; role: string; status: string; expiresAt: string;
}
const labels: Record<string, string> = { PENDING: 'Pendente', ACCEPTED: 'Aceito', EXPIRED: 'Expirado', REVOKED: 'Revogado' };
const roles: Record<string, string> = { STUDENT: 'Aluno', INSTRUCTOR: 'Instrutor', MANAGER: 'Gestor', ADMIN: 'Administrador' };
const inputClass = 'mt-2 w-full rounded-lg border border-outline-variant bg-surface-bright px-3 py-2 text-on-surface';

export default function CompanyInvitations({ tenantId }: { tenantId: string }) {
  const [items, setItems] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [revoking, setRevoking] = useState<Invitation | null>(null);
  const working = useRef(false);
  const request = useRef<{ payload: string; id: string } | null>(null);
  const toast = useToast();
  const base = '/tenants/' + tenantId + '/invitations';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.get<Invitation[]>(base).then(({ data }) => { if (active) setItems(data); })
      .catch(() => { if (active) setError('Não foi possível carregar os convites.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [base, reload]);

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working.current) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const payload = { name: String(values.get('name')).trim(), email: String(values.get('email')).trim().toLowerCase(), role: String(values.get('role')) };
    if (!payload.name) return;
    const signature = JSON.stringify(payload);
    if (request.current?.payload !== signature) request.current = { payload: signature, id: crypto.randomUUID() };
    working.current = true;
    setBusy(true);
    try {
      await api.post(base, { ...payload, requestId: request.current.id });
      request.current = null;
      form.reset();
      setReload(value => value + 1);
      toast.success('Convite enviado por e-mail. O destinatário tem 48 horas para definir a senha.');
    } catch (error) {
      toast.error(requestError(error, 'Não foi possível enviar o convite. Verifique o serviço de e-mail e tente novamente.'));
    } finally { working.current = false; setBusy(false); }
  }

  async function manage(invitation: Invitation, revoke: boolean) {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    try {
      if (revoke) await api.delete(base + '/' + invitation.id);
      else await api.post(base + '/' + invitation.id + '/resend');
      setReload(value => value + 1);
      toast.success(revoke ? 'Convite revogado.' : 'Convite reenviado. O link anterior deixou de funcionar.');
    } catch (error) {
      toast.error(requestError(error, 'Não foi possível atualizar o convite. Tente novamente.'));
    } finally { working.current = false; setBusy(false); }
  }

  return <section className="space-y-6" aria-label="Convites da empresa">
    <form onSubmit={invite} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
      <h2 className="text-lg font-bold">Convidar colaborador</h2>
      <p className="mt-1 text-sm text-on-surface-variant">O convite vincula o destinatário a esta empresa. Cada pessoa define sua própria senha.</p>
      <fieldset disabled={busy} className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm">Nome<input name="name" required maxLength={100} className={inputClass} /></label>
        <label className="text-sm">E-mail<input name="email" type="email" required maxLength={150} className={inputClass} /></label>
        <label className="text-sm">Perfil<select name="role" defaultValue="STUDENT" className={inputClass}>{Object.entries(roles).map(([role, name]) => <option key={role} value={role}>{name}</option>)}</select></label>
        <button className="self-end rounded-xl bg-primary-container px-5 py-3 text-sm font-bold text-white disabled:opacity-50" type="submit">{busy ? 'Aguarde...' : 'Enviar convite'}</button>
      </fieldset>
    </form>
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">Convites enviados</h2><button disabled={loading || busy} onClick={() => setReload(value => value + 1)} className="text-primary underline disabled:opacity-50">Atualizar convites</button></div>
    {error && <p role="alert">{error}</p>}
    {loading ? <p role="status">Carregando convites...</p> : !error && <>
      {items.length === 0 && <p className="text-on-surface-variant">Nenhum convite enviado para esta empresa.</p>}
      {items.map(item => <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-outline-variant p-4">
        <div className="min-w-0"><h3 className="font-bold">{item.name}</h3><p className="break-all text-sm">{item.email}</p><p className="text-sm text-on-surface-variant">{roles[item.role]} · {labels[item.status]}</p>
          {['PENDING', 'EXPIRED'].includes(item.status) && <p className="text-xs text-on-surface-variant">Validade: {new Date(item.expiresAt).toLocaleString('pt-BR')}</p>}
        </div>
        {['PENDING', 'EXPIRED'].includes(item.status) && <div className="flex gap-4">
          <button disabled={busy} onClick={() => manage(item, false)} className="text-sm text-primary underline disabled:opacity-50">Reenviar</button>
          <button disabled={busy} onClick={() => setRevoking(item)} className="text-sm text-primary underline disabled:opacity-50">Revogar</button>
        </div>}
      </article>)}
    </>}
    <ConfirmDialog open={!!revoking} onClose={() => setRevoking(null)} onConfirm={async () => { if (revoking) await manage(revoking, true); }} title="Revogar convite" message={'O link enviado para ' + (revoking?.email || '') + ' deixará de funcionar.'} confirmLabel="Revogar" />
  </section>;
}

