import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, Plus } from 'lucide-react';
import api from '../services/api';
import { PageContainer, PageHeader, Button, Input } from '../components/ui';
import CompanyInvitations from '../components/CompanyInvitations';
import CompanyRegistration, { type Company } from '../components/CompanyRegistration';
import FieldError from '../components/ui/FieldError';

export default function Companies() {
  const [params, setParams] = useSearchParams();
  const selected = params.get('company') || '';
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState('');
  const [registering, setRegistering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.get<Company[]>('/tenants').then(({ data }) => { if (active) setCompanies(data); })
      .catch(() => { if (active) setError('Não foi possível carregar as empresas.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);
  const company = companies.find(item => item.id === selected);
  const visible = companies.filter(item => item.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));

  return <PageContainer className="pb-12">
    <PageHeader icon={<Building2 className="h-6 w-6" />} title="Empresas clientes" subtitle="Consulte as empresas cadastradas e gerencie seus convites."
      actions={<Button onClick={() => setRegistering(true)}><Plus className="h-4 w-4" />Nova empresa</Button>} />
    <div className="mb-6 flex items-end gap-4">
      <Input wrapperClassName="flex-1" label="Buscar empresa" value={search} onChange={event => setSearch(event.target.value)} />
      <Button variant="ghost" disabled={loading} onClick={() => setReload(value => value + 1)}>Atualizar</Button>
    </div>
    {loading ? <p role="status">Carregando empresas...</p> : error ? <FieldError>{error}</FieldError> : <>
      <div className="grid gap-4 sm:grid-cols-2">
        {visible.map(item => <article key={item.id} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
          <h2 className="text-lg font-semibold break-words">{item.name}</h2>
          <button onClick={() => setParams({ company: item.id })} aria-label={'Gerenciar convites de ' + item.name} aria-pressed={selected === item.id} className="mt-3 text-sm font-semibold text-primary underline">Gerenciar convites</button>
        </article>)}
      </div>
      {!visible.length && <p className="text-on-surface-variant">{companies.length ? 'Nenhuma empresa encontrada.' : 'Nenhuma empresa cadastrada.'}</p>}
      {company && <section className="mt-8 space-y-5" aria-label={'Gestão de ' + company.name}>
        <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">Convites de {company.name}</h2><Button variant="ghost" onClick={() => setParams({})}>Fechar gestão</Button></div>
        <CompanyInvitations key={company.id} tenantId={company.id} />
      </section>}
      {selected && !company && <p role="alert" className="mt-6">A empresa selecionada não está disponível.</p>}
    </>}
    {registering && <CompanyRegistration onClose={() => setRegistering(false)} onCreated={created => setCompanies(current => [...current.filter(item => item.id !== created.id), created])} />}
  </PageContainer>;
}
