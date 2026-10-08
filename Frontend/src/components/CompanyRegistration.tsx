import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Modal, useToast } from './ui';
import InvitationLink, { type GeneratedInvitationLink } from './InvitationLink';
import { requestError } from '../lib/requestError';

export interface Company { id: string; name: string; }
export interface CompanyPrefill { companyName?: string; adminName?: string; adminEmail?: string; }
const inputClass = 'mt-2 w-full rounded-lg border border-outline-variant bg-surface-bright px-3 py-2 text-on-surface';

export default function CompanyRegistration({ prefill = {}, onClose, onCreated }: { prefill?: CompanyPrefill; onClose: () => void; onCreated?: (company: Company) => void }) {
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<Company | null>(null);
  const [link, setLink] = useState<GeneratedInvitationLink | null>(null);
  const working = useRef(false);
  const request = useRef<{ payload: string; id: string } | null>(null);
  const toast = useToast();
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working.current) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const payload = { name: String(values.get('name')).trim(), adminName: String(values.get('adminName')).trim(), adminEmail: String(values.get('adminEmail')).trim().toLowerCase() };
    if (!payload.name || !payload.adminName) return;
    const signature = JSON.stringify(payload);
    if (request.current?.payload !== signature) request.current = { payload: signature, id: crypto.randomUUID() };
    working.current = true;
    setSaving(true);
    try {
      const { data } = await api.post<Company & { invitationToken: string | null }>('/tenants?delivery=LINK', { ...payload, requestId: request.current.id });
      request.current = null;
      setCreated(data);
      setLink(data.invitationToken ? { invitationToken: data.invitationToken, email: payload.adminEmail } : null);
      onCreated?.(data);
      form.reset();
      toast.success(data.invitationToken ? 'Empresa criada. Copie o convite do administrador abaixo.' : 'Empresa já cadastrada. Gere um novo link na lista de convites.');
    } catch (error) {
      toast.error(requestError(error, 'Não foi possível concluir a criação. Tente novamente. Se o problema continuar, contate o suporte.'));
    } finally { working.current = false; setSaving(false); }
  }

  return <Modal open onClose={() => { if (!working.current) onClose(); }} title={created ? 'Empresa cadastrada' : 'Cadastrar empresa'} size="lg">
    <div className="max-h-[70vh] overflow-y-auto space-y-5">
    {created ? <>
      <p className="font-semibold">{created.name}</p>
      {link ? <InvitationLink {...link} /> : <p>Esta solicitação já foi concluída. Acesse a empresa para gerar outro link de convite.</p>}
      <Link to={'/companies?company=' + encodeURIComponent(created.id)} onClick={onClose} className="inline-block rounded-xl bg-primary-container px-5 py-3 font-semibold text-white">Ver empresa</Link>
    </> : <>
    <p className="text-sm text-on-surface-variant">Cadastre o ambiente após confirmar a contratação e confira os dados do administrador responsável.</p>
    <form onSubmit={create} className="mb-8 space-y-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6">
      <h2 className="text-lg font-bold">Nova empresa</h2>
      <fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">Nome da empresa<input name="name" required maxLength={150} defaultValue={prefill.companyName || ''} className={inputClass} /></label>
        <label className="text-sm">Nome do administrador<input name="adminName" required maxLength={100} defaultValue={prefill.adminName || ''} className={inputClass} /></label>
        <label className="text-sm">E-mail do administrador<input name="adminEmail" type="email" required maxLength={150} defaultValue={prefill.adminEmail || ''} className={inputClass} /></label>
        <p className="text-sm text-on-surface-variant sm:col-span-2">Você receberá um link para entregar ao administrador. Ele terá 48 horas para definir a senha. Não há envio de e-mail, cobrança ou configuração de domínio.</p>
        <button type="submit" className="rounded-xl bg-primary-container px-5 py-3 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2">{saving ? 'Criando empresa...' : 'Criar empresa e gerar convite'}</button>
      </fieldset>
    </form>
    </>}
    </div>
  </Modal>;
}
