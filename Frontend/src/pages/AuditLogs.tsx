import { useState, useEffect } from "react";
import { Activity, Search, Download } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

export default function AuditLogs() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/audit-logs")
      .then(res => {
        setLogs(res.data.content || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-outline-variant pb-6">
        <div className="space-y-1 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center text-primary shadow-sm">
             <Activity className="w-6 h-6" />
          </div>
          <div>
             <h1 className="text-3xl font-display font-bold text-on-surface">
               Logs de Auditoria
             </h1>
             <p className="text-on-surface-variant">Rastreie todas as ações do sistema para conformidade e segurança.</p>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden shadow-sm">
        <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-bright">
           <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input type="text" placeholder="Buscar logs..." className="w-full bg-surface-container border border-outline-variant rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:border-primary" />
           </div>
           <button className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-sm font-medium hover:bg-surface-container transition-colors">
              <Download className="w-4 h-4" /> Exportar CSV
           </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/30 border-b border-outline-variant">
                <th className="p-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  Data/Hora
                </th>
                <th className="p-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  Usuário
                </th>
                <th className="p-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  Ação
                </th>
                <th className="p-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  Entidade
                </th>
                <th className="p-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  IP
                </th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-on-surface-variant">Carregando logs...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-on-surface-variant">Nenhum log encontrado.</td></tr>
              ) : logs.map((log, idx) => (
                <tr
                  key={log.id}
                  className="border-b border-outline-variant hover:bg-surface-bright transition-colors"
                >
                  <td className="p-4 font-medium text-on-surface-variant">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4 font-semibold text-primary">
                    {log.user?.name || "Sistema"}
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm bg-surface-container text-on-surface-variant">
                      {log.actionType}
                    </span>
                  </td>
                  <td className="p-4 text-on-surface-variant">
                    {log.entityType || "-"}
                  </td>
                  <td className="p-4 text-xs font-mono text-on-surface-variant">
                    {log.ipAddress || "0.0.0.0"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
