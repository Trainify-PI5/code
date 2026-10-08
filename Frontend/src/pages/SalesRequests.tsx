import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageContainer, PageHeader } from "../components/ui";
import api from "../services/api";
import { Inbox, MessagesSquare, Archive } from "lucide-react";

type Status = "NEW" | "CONTACTED" | "CLOSED";
interface Lead {
  id: string; firstName: string; lastName: string; email: string; phone: string;
  company: string; jobTitle: string; companySize: string; message: string | null;
  status: Status; createdAt: string;
}
const labels: Record<Status, string> = { NEW: "Nova", CONTACTED: "Em contato", CLOSED: "Encerrada" };
const tabs = [
  { status: 'NEW' as const, label: 'Novas solicitações', icon: Inbox },
  { status: 'CONTACTED' as const, label: 'Em contato', icon: MessagesSquare },
  { status: 'CLOSED' as const, label: 'Solicitações encerradas', icon: Archive },
];

export default function SalesRequests() {
  const [items, setItems] = useState<Lead[]>([]);
  const [activeStatus, setActiveStatus] = useState<Status>('NEW');
  const [page, setPage] = useState(0);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const controller = new AbortController();
    async function load() {
      const all: Lead[] = [];
      let nextPage = 0;
      while (!cancelled) {
        const { data } = await api.get<{ items: Lead[]; total: number }>("/sales-requests", { params: { page: nextPage }, signal: controller.signal });
        all.push(...data.items);
        nextPage++;
        if (nextPage * 20 >= data.total) break;
        if (data.items.length === 0) throw new Error('Incomplete response');
      }
      if (!cancelled) setItems([...new Map(all.map(item => [item.id, item])).values()]);
    }
    load().catch(() => { if (!cancelled) setError("Não foi possível carregar as solicitações."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; controller.abort(); };
  }, [reload]);

  const filtered = items.filter(item => item.status === activeStatus);
  const total = filtered.length;
  const currentPage = Math.min(page, Math.max(0, Math.ceil(total / 20) - 1));
  const visible = filtered.slice(currentPage * 20, (currentPage + 1) * 20);
  const selectTab = (status: Status) => { setActiveStatus(status); setPage(0); };

  async function update(id: string, status: Status) {
    if (saving) return;
    setSaving(id);
    setError("");
    try {
      await api.patch(`/sales-requests/${id}/status`, { status });
      setItems(current => current.map(lead => lead.id === id ? { ...lead, status } : lead));
    } catch { setError("Não foi possível atualizar o atendimento. Tente novamente."); }
    finally { setSaving(null); }
  }

  return <PageContainer>
    <PageHeader title="Solicitações comerciais" subtitle="Empresas interessadas em conhecer e contratar a Trainify." />
    <div role="tablist" aria-label="Etapas do atendimento" className="mt-6 flex flex-wrap gap-2">
      {tabs.map(({ status, label, icon: Icon }, index) => <button key={status} id={'sales-tab-' + status} role="tab" type="button"
        aria-selected={activeStatus === status} aria-controls="sales-panel" tabIndex={activeStatus === status ? 0 : -1}
        disabled={!!saving} onClick={() => selectTab(status)}
        onKeyDown={event => {
          const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
          if (next < 0) return;
          event.preventDefault();
          selectTab(tabs[next].status);
          document.getElementById('sales-tab-' + tabs[next].status)?.focus();
        }}
        className={'flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold disabled:opacity-50 ' + (activeStatus === status ? 'border-primary-container bg-primary-container text-white' : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary')}>
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />{label}
        {!loading && !error && <span className="rounded-full bg-current/10 px-2 text-xs">{items.filter(item => item.status === status).length}</span>}
      </button>)}
    </div>
    <section id="sales-panel" role="tabpanel" aria-labelledby={'sales-tab-' + activeStatus}>
    <div className="my-5 flex items-center justify-between gap-4"><p className="text-sm text-on-surface-variant">{!loading && !error ? `${total} solicitação(ões)` : "Atendimento comercial"}</p><button disabled={loading || !!saving} onClick={() => setReload(value => value + 1)} className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50">Atualizar</button></div>
    {error && <p role="alert" className="mb-5 rounded-xl border border-red-300 p-4 text-sm text-red-700 dark:text-red-300">{error}</p>}
    {loading ? <p role="status">Carregando solicitações...</p> : <div className="space-y-4">
      {!error && visible.length === 0 && <p className="rounded-xl border border-outline-variant p-8 text-center text-on-surface-variant">{activeStatus === 'NEW' ? 'Nenhuma nova solicitação.' : activeStatus === 'CONTACTED' ? 'Nenhuma solicitação em contato.' : 'Nenhuma solicitação encerrada.'}</p>}
      {visible.map(lead => <article key={lead.id} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-display text-xl font-bold">{lead.company}</h2><p className="mt-1 text-sm text-on-surface-variant">{lead.firstName} {lead.lastName} · {lead.jobTitle}</p></div><label className="text-xs font-semibold">Atendimento<select aria-label={`Atendimento de ${lead.company}`} value={lead.status} disabled={!!saving} onChange={event => update(lead.id, event.target.value as Status)} className="ml-3 rounded-lg border border-outline-variant bg-surface-bright p-2 text-sm">{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-on-surface-variant">E-mail</dt><dd className="mt-1 break-all"><a className="text-primary underline" href={`mailto:${lead.email}`}>{lead.email}</a></dd></div><div><dt className="text-on-surface-variant">Telefone</dt><dd className="mt-1"><a className="text-primary underline" href={`tel:${lead.phone}`}>{lead.phone}</a></dd></div><div><dt className="text-on-surface-variant">Funcionários</dt><dd className="mt-1">{lead.companySize === "1001+" ? "Mais de 1.000" : lead.companySize.replace("-", " a ")}</dd></div><div><dt className="text-on-surface-variant">Recebida em</dt><dd className="mt-1">{new Date(lead.createdAt).toLocaleString("pt-BR")}</dd></div></dl>
        {lead.message && <p className="mt-5 whitespace-pre-wrap break-words rounded-xl bg-surface-bright p-4 text-sm">{lead.message}</p>}
        <Link to="/companies" state={{ companyName: lead.company, adminName: lead.firstName + ' ' + lead.lastName, adminEmail: lead.email }} className="mt-4 inline-block rounded-lg bg-primary-container px-4 py-2 text-sm font-bold text-white">Cadastrar empresa após contratação</Link>
        <p className="mt-4 break-all font-mono text-xs text-on-surface-variant">Protocolo: {lead.id}</p>
      </article>)}
    </div>}
    <div className="mt-6 flex items-center justify-between text-sm"><button disabled={currentPage === 0 || loading || !!saving} onClick={() => setPage(currentPage - 1)} className="rounded-lg border border-outline-variant px-4 py-2 disabled:opacity-40">Anterior</button><span>Página {currentPage + 1}</span><button disabled={(currentPage + 1) * 20 >= total || loading || !!saving} onClick={() => setPage(currentPage + 1)} className="rounded-lg border border-outline-variant px-4 py-2 disabled:opacity-40">Próxima</button></div>
    </section>
  </PageContainer>;
}
