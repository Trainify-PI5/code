import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import api from '../services/api';
import { PageContainer, PageHeader, useToast } from '../components/ui';
import CompanyInvitations from '../components/CompanyInvitations';
import InvitationLink, { type GeneratedInvitationLink } from '../components/InvitationLink';
import { requestError } from '../lib/requestError';

interface Company { id: string; name: string; }
interface Prefill { companyName?: string; adminName?: string; adminEmail?: string; }
const inputClass = 'mt-2 w-full rounded-lg border border-outline-variant bg-surface-bright px-3 py-2 text-on-surface';

export default function Companies() {
  const location = useLocation();
  const prefill = (location.state || {}) as Prefill;
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const [link, setLink] = useState<GeneratedInvitationLink | null>(null);
  const working = useRef(false);
  const request = useRef<{ payload: string; id: string } | null>(null);
  const toast = useToast();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.get<Company[]>('/tenants').then(({ data }) => { if (active) setCompanies(data); })
      .catch(() => { if (active) setError('Não foi possível carregar as empresas.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

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
      setSelected(data.id);
      setLink(data.invitationToken ? { invitationToken: data.invitationToken, email: payload.adminEmail } : null);
      setCompanies(current => [...current.filter(company => company.id !== data.id), { id: data.id, name: data.name }]);
      form.reset();
      toast.success(data.invitationToken ? 'Empresa criada. Copie o convite do administrador abaixo.' : 'Empresa já cadastrada. Gere um novo link na lista de convites.');
    } catch (error) {
      toast.error(requestError(error, 'Não foi possível concluir a criação. Tente novamente. Se o problema continuar, contate o suporte.'));
    } finally { working.current = false; setSaving(false); }
  }

  return <PageContainer className="pb-12">
    <PageHeader icon={<Building2 className="h-6 w-6" />} title="Empresas clientes" subtitle="Crie o ambiente do cliente após a contratação e convide o administrador responsável." />
    <form onSubmit={create} className="mb-8 space-y-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6">
      <h2 className="text-lg font-bold">Nova empresa</h2>
      <fieldset disabled={saving || loading} className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">Nome da empresa<input name="name" required maxLength={150} defaultValue={prefill.companyName || ''} className={inputClass} /></label>
        <label className="text-sm">Nome do administrador<input name="adminName" required maxLength={100} defaultValue={prefill.adminName || ''} className={inputClass} /></label>
        <label className="text-sm">E-mail do administrador<input name="adminEmail" type="email" required maxLength={150} defaultValue={prefill.adminEmail || ''} className={inputClass} /></label>
        <p className="text-sm text-on-surface-variant sm:col-span-2">Você receberá um link para entregar ao administrador. Ele terá 48 horas para definir a senha. Não há envio de e-mail, cobrança ou configuração de domínio.</p>
        <button type="submit" className="rounded-xl bg-primary-container px-5 py-3 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2">{saving ? 'Criando empresa...' : 'Criar empresa e gerar convite'}</button>
      </fieldset>
    </form>
    <div className="mb-5 flex items-end gap-4">
      <label className="min-w-0 flex-1 text-sm font-bold">Empresa para gerenciar convites<select value={selected} onChange={event => { setSelected(event.target.value); setLink(null); }} className={inputClass} disabled={saving}>
        <option value="">Selecione uma empresa</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
      </select></label>
      <button disabled={loading || saving} onClick={() => setReload(value => value + 1)} className="pb-2 text-primary underline disabled:opacity-50">Atualizar</button>
    </div>
    {loading && <p role="status">Carregando empresas...</p>}
    {error && <p role="alert" className="mb-4">{error}</p>}
    {link && <InvitationLink key={link.invitationToken} {...link} />}
    {selected && <CompanyInvitations key={selected} tenantId={selected} onLinkChanged={() => setLink(null)} />}
  </PageContainer>;
}
