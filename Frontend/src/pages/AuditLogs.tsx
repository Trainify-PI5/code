import { useState, useEffect } from "react";
import { Activity, Search, Download } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";
import { DataTable, PageContainer, PageHeader, useToast, type Coluna } from "../components/ui";

export default function AuditLogs() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const toast = useToast();

  // Os logs vem inteiros da API, entao a busca filtra o que ja esta em memoria.
  const textoDoLog = (log: any) =>
    [log.user?.name, log.actionType, log.entityType, log.ipAddress]
      .filter(Boolean)
      .join(" ")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();

  const termo = busca
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  const logsFiltrados = termo ? logs.filter((log) => textoDoLog(log).includes(termo)) : logs;

  const colunas: Coluna<any>[] = [
    {
      key: "createdAt",
      header: "Data/Hora",
      sortValue: (log) => new Date(log.createdAt),
      render: (log) => (
        <span className="font-medium text-on-surface-variant whitespace-nowrap">
          {new Date(log.createdAt).toLocaleString("pt-BR")}
        </span>
      ),
    },
    {
      key: "user",
      header: "Usuário",
      sortValue: (log) => log.user?.name || "Sistema",
      render: (log) => (
        <span className="font-semibold text-primary">{log.user?.name || "Sistema"}</span>
      ),
    },
    {
      key: "actionType",
      header: "Ação",
      sortValue: (log) => log.actionType,
      render: (log) => (
        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm bg-surface-container text-on-surface-variant">
          {log.actionType}
        </span>
      ),
    },
    {
      key: "entityType",
      header: "Entidade",
      sortValue: (log) => log.entityType,
      render: (log) => <span className="text-on-surface-variant">{log.entityType || "-"}</span>,
    },
    {
      key: "ipAddress",
      header: "IP",
      sortValue: (log) => log.ipAddress,
      render: (log) => (
        <span className="text-xs font-mono text-on-surface-variant">
          {log.ipAddress || "0.0.0.0"}
        </span>
      ),
    },
  ];

  // Os logs ja estao em memoria, entao o CSV e montado no proprio navegador —
  // nao depende de rota de exportacao no backend.
  const exportarCSV = () => {
    if (logsFiltrados.length === 0) {
      toast.info("Não há logs para exportar.");
      return;
    }

    const colunas = ["Data/Hora", "Usuário", "Ação", "Entidade", "IP"];
    const escapar = (valor: unknown) => `"${String(valor ?? "").replace(/"/g, '""')}"`;
    const linhas = logsFiltrados.map((log) =>
      [
        new Date(log.createdAt).toLocaleString("pt-BR"),
        log.user?.name || "Sistema",
        log.actionType,
        log.entityType || "-",
        log.ipAddress || "-",
      ]
        .map(escapar)
        .join(";"),
    );

    // BOM para o Excel reconhecer os acentos; ";" porque o Excel pt-BR usa
    // virgula como separador decimal.
    const csv =
      String.fromCharCode(0xfeff) + [colunas.map(escapar).join(";"), ...linhas].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(`${logs.length} registro(s) exportado(s).`);
  };

  useEffect(() => {
    api.get("/audit-logs")
      .then(res => {
        setLogs(res.data.content || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageContainer width="wide">
      <PageHeader
        icon={<Activity className="w-6 h-6" />}
        title="Logs de Auditoria"
        subtitle="Rastreie todas as ações do sistema para conformidade e segurança."
      />

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden shadow-sm">
        <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-bright">
           <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar logs..."
                aria-label="Buscar logs"
                className="w-full bg-surface-container border border-outline-variant rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:border-primary"
              />
           </div>
           <button
              onClick={exportarCSV}
              className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-sm font-medium hover:bg-surface-container transition-colors"
           >
              <Download className="w-4 h-4" /> Exportar CSV
           </button>
        </div>
        <DataTable
          columns={colunas}
          rows={logsFiltrados}
          rowKey={(log) => log.id}
          loading={loading}
          pageSize={20}
          skeletonRows={6}
          initialSort={{ key: "createdAt", direcao: "desc" }}
          emptyMessage={termo ? "Nenhum log corresponde à busca." : "Nenhum log encontrado."}
        />
      </div>
    </PageContainer>
  );
}
