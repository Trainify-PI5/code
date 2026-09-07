import { useState, useEffect } from "react";
import { Building2, Save, UploadCloud } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

export default function TenantSettings() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenant, setTenant] = useState<any>({
    name: "",
    domain: "",
    primaryColor: "#4B2C92",
    secondaryColor: "#9D84B7",
    logoUrl: "",
  });

  useEffect(() => {
    api.get("/tenants/me").then((res) => {
      setTenant({
        ...res.data,
        primaryColor: res.data.primaryColor || "#4B2C92",
        secondaryColor: res.data.secondaryColor || "#9D84B7",
      });
      setLoading(false);
    }).catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/tenants/me", tenant);
      alert("Configurações atualizadas com sucesso!");
    } catch (e) {
      alert("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Carregando...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-16">
      <div className="border-b border-outline-variant pb-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center text-primary shadow-sm">
           <Building2 className="w-6 h-6" />
        </div>
        <div>
           <h1 className="text-3xl font-display font-bold text-on-surface">Configurações da Empresa</h1>
           <p className="text-on-surface-variant mt-1">Personalize a identidade visual e domínio da sua plataforma.</p>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 shadow-sm space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Nome da Empresa</label>
            <input
              type="text"
              value={tenant.name}
              onChange={(e) => setTenant({ ...tenant, name: e.target.value })}
              className="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5 text-sm focus:border-primary outline-none transition-all text-on-surface"
              placeholder="Ex: Minha Empresa Corp"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Domínio Personalizado</label>
            <input
              type="text"
              value={tenant.domain || ""}
              onChange={(e) => setTenant({ ...tenant, domain: e.target.value })}
              className="w-full bg-surface-bright border border-outline-variant rounded-lg px-4 py-2.5 text-sm focus:border-primary outline-none transition-all text-on-surface"
              placeholder="Ex: academy.minhaempresa.com"
            />
          </div>
        </div>

        <div className="border-t border-outline-variant pt-8">
           <h3 className="text-lg font-display font-bold mb-6">Identidade Visual</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Cores */}
              <div className="space-y-6">
                 <div className="space-y-2">
                   <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Cor Principal</label>
                   <div className="flex items-center gap-3">
                     <input
                       type="color"
                       value={tenant.primaryColor}
                       onChange={(e) => setTenant({ ...tenant, primaryColor: e.target.value })}
                       className="w-12 h-12 rounded cursor-pointer border border-outline-variant"
                     />
                     <input
                       type="text"
                       value={tenant.primaryColor}
                       onChange={(e) => setTenant({ ...tenant, primaryColor: e.target.value })}
                       className="flex-1 bg-surface-bright border border-outline-variant rounded-lg px-4 py-2 text-sm focus:border-primary outline-none text-on-surface"
                     />
                   </div>
                 </div>

                 <div className="space-y-2">
                   <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Cor Secundária</label>
                   <div className="flex items-center gap-3">
                     <input
                       type="color"
                       value={tenant.secondaryColor}
                       onChange={(e) => setTenant({ ...tenant, secondaryColor: e.target.value })}
                       className="w-12 h-12 rounded cursor-pointer border border-outline-variant"
                     />
                     <input
                       type="text"
                       value={tenant.secondaryColor}
                       onChange={(e) => setTenant({ ...tenant, secondaryColor: e.target.value })}
                       className="flex-1 bg-surface-bright border border-outline-variant rounded-lg px-4 py-2 text-sm focus:border-primary outline-none text-on-surface"
                     />
                   </div>
                 </div>
              </div>

              {/* Logo */}
              <div className="space-y-4">
                 <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Logotipo</label>
                 {tenant.logoUrl ? (
                    <div className="w-full h-32 bg-surface-bright border border-outline-variant rounded-xl flex items-center justify-center p-4 relative group">
                       <img src={tenant.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                       <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button 
                             onClick={() => setTenant({...tenant, logoUrl: ""})}
                             className="bg-white text-red-500 px-4 py-2 rounded-lg text-sm font-bold shadow-sm"
                          >
                             Remover Logo
                          </button>
                       </div>
                    </div>
                 ) : (
                    <div className="w-full h-32 bg-surface-bright border-2 border-dashed border-outline-variant hover:border-primary rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors">
                       <UploadCloud className="w-6 h-6 text-on-surface-variant" />
                       <span className="text-sm font-medium text-on-surface-variant">Clique para enviar a logo</span>
                    </div>
                 )}
              </div>

           </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-outline-variant">
          <button 
            disabled={saving}
            onClick={handleSave}
            className="bg-primary-container text-white px-8 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Salvando..." : "Salvar Configurações"}
          </button>
        </div>
      </div>
    </div>
  );
}
