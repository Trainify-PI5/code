import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react';
import axios from 'axios';
import { Building2, Save } from 'lucide-react';
import api from '../services/api';
import { PageContainer, PageHeader, useToast } from '../components/ui';
import { useBranding, type CompanyBranding } from '../contexts/CompanyBrandingContext';
import { validBrandColor } from '../lib/branding';

const inputClass = 'w-full min-w-0 bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5 text-sm text-on-surface focus:outline-primary';
const normalize = (data: CompanyBranding) => ({ ...data, primaryColor: data.primaryColor || '#4B2C92', secondaryColor: data.secondaryColor || '#9D84B7' });

export default function TenantSettings() {
  const [tenant, setTenant] = useState<ReturnType<typeof normalize> | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState<'saving' | 'uploading' | null>(null);
  const working = useRef(false);
  const toast = useToast();
  const { update } = useBranding();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    api.get<CompanyBranding>('/tenants/me').then(({ data }) => {
      if (active) setTenant(normalize(data));
    }).catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!tenant || working.current) return;
    if (!tenant.name.trim() || !validBrandColor(tenant.primaryColor) || !validBrandColor(tenant.secondaryColor)) {
      toast.error('Preencha o nome e use cores no formato #4B2C92.');
      return;
    }
    working.current = true;
    setBusy('saving');
    try {
      const { data } = await api.put<CompanyBranding>('/tenants/me', {
        name: tenant.name.trim(), domain: tenant.domain?.trim().toLowerCase() || null,
        primaryColor: tenant.primaryColor, secondaryColor: tenant.secondaryColor, logoKey: tenant.logoKey,
      });
      setTenant(normalize(data));
      update(data);
      toast.success('Configurações da empresa atualizadas.');
    } catch {
      toast.error('Não foi possível salvar. Verifique os dados e tente novamente.');
    } finally { working.current = false; setBusy(null); }
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || working.current) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size === 0 || file.size > 2 * 1024 * 1024) {
      toast.error('Use uma imagem PNG, JPEG ou WebP de até 2 MB.');
      return;
    }
    working.current = true;
    setBusy('uploading');
    try {
      const { data } = await api.post<{ key: string; url: string; previewUrl: string }>('/tenants/me/logo-upload-url', { filename: file.name, contentType: file.type });
      await axios.put(data.url, file, { headers: { 'Content-Type': file.type }, timeout: 60000 });
      setTenant(current => current && ({ ...current, logoKey: data.key, logoUrl: data.previewUrl }));
      toast.success('Logo enviada. Salve as configurações para aplicar.');
    } catch { toast.error('Não foi possível enviar a logo. Tente novamente.'); }
    finally { working.current = false; setBusy(null); }
  };

  if (loading) return <div className="p-8" role="status">Carregando configurações...</div>;
  if (failed || !tenant) return <div className="p-8 space-y-4" role="alert"><p>Não foi possível carregar as configurações.</p><button onClick={() => setAttempt(value => value + 1)} className="text-primary underline">Tentar novamente</button></div>;

  return <PageContainer className="pb-16">
    <PageHeader icon={<Building2 className="w-6 h-6" />} title="Configurações da Empresa" subtitle="Personalize a identidade visual do ambiente da sua empresa." />
    <form onSubmit={save} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 sm:p-8">
      <fieldset disabled={busy !== null} className="space-y-8 disabled:opacity-70">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2"><label htmlFor="company-name" className="text-sm font-bold">Nome da empresa</label><input id="company-name" required maxLength={150} value={tenant.name} onChange={e => setTenant({ ...tenant, name: e.target.value })} className={inputClass} /></div>
          <div className="space-y-2"><label htmlFor="company-domain" className="text-sm font-bold">Domínio desejado (opcional)</label><input id="company-domain" maxLength={100} value={tenant.domain || ''} onChange={e => setTenant({ ...tenant, domain: e.target.value })} placeholder="academy.suaempresa.com.br" aria-describedby="domain-help" className={inputClass} /><p id="domain-help" className="text-sm text-on-surface-variant">Salvar este campo não ativa o endereço. O domínio precisa ser configurado separadamente no DNS e na hospedagem.</p></div>
        </div>
        <div className="border-t border-outline-variant pt-8 space-y-6">
          <h2 className="text-lg font-bold">Identidade visual</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">{(['primaryColor', 'secondaryColor'] as const).map((key, index) => <div key={key} className="space-y-2">
              <label htmlFor={key} className="text-sm font-bold">{index === 0 ? 'Cor principal' : 'Cor secundária'}</label>
              <div className="flex gap-3"><input type="color" aria-label={index === 0 ? 'Selecionar cor principal' : 'Selecionar cor secundária'} value={validBrandColor(tenant[key]) ? tenant[key] : '#000000'} onChange={e => setTenant({ ...tenant, [key]: e.target.value })} className="w-12 h-11 shrink-0 cursor-pointer" /><input id={key} required pattern="#[0-9a-fA-F]{6}" maxLength={7} value={tenant[key]} onChange={e => setTenant({ ...tenant, [key]: e.target.value })} className={inputClass} /></div>
            </div>)}<p className="text-sm text-on-surface-variant">Os tons são ajustados para manter a leitura nos modos claro e escuro.</p></div>
            <div className="space-y-3">
              <label htmlFor="company-logo" className="block text-sm font-bold">Logotipo</label>
              {tenant.logoUrl && <div className="rounded-xl bg-white p-4"><img src={tenant.logoUrl} alt={'Logo de ' + tenant.name} className="h-24 max-w-full mx-auto object-contain" /></div>}
              <input id="company-logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} aria-describedby="logo-help" className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:p-3 file:bg-primary-container file:text-white" />
              <p id="logo-help" className="text-sm text-on-surface-variant">PNG, JPEG ou WebP, até 2 MB. A logo será exibida no menu da plataforma após salvar.</p>
              {tenant.logoUrl && <button type="button" className="text-sm text-primary underline" onClick={() => setTenant({ ...tenant, logoUrl: null, logoKey: '' })}>Remover logo</button>}
            </div>
          </div>
        </div>
        <div className="flex justify-end border-t border-outline-variant pt-6"><button type="submit" className="bg-primary-container text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-50"><Save className="w-4 h-4" />{busy === 'saving' ? 'Salvando...' : busy === 'uploading' ? 'Enviando logo...' : 'Salvar configurações'}</button></div>
      </fieldset>
    </form>
  </PageContainer>;
}
