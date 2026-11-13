import { useState, useEffect } from "react";
import {
  Award,
  Download,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useLanguage } from "../contexts/LanguageContext";
import { Button, PageContainer, PageHeader, useToast } from "../components/ui";
import api from "../services/api";
import { baixarBlob, nomeDeArquivo } from "../lib/download";

interface Certificate {
  id: string;
  title: string;
  date: string;
  issuer: string;
  color: string;
}

export default function Certifications() {
  const toast = useToast();
  const { t, language } = useLanguage();

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revisao, setRevisao] = useState(0);
  const [baixando, setBaixando] = useState<string | null>(null);
  const [baixandoTodos, setBaixandoTodos] = useState(false);

  const obterPdf = async (cert: Certificate) => {
    const { data } = await api.get(`/certifications/${cert.id}/pdf`, {
      responseType: "blob",
    });
    return new File([data], `certificado-${nomeDeArquivo(cert.title, cert.id)}.pdf`, { type: "application/pdf" });
  };

  const buscarPdf = async (cert: Certificate) => {
    const arquivo = await obterPdf(cert);
    baixarBlob(arquivo, arquivo.name);
  };

  const baixarUm = async (cert: Certificate) => {
    setBaixando(cert.id);
    try {
      await buscarPdf(cert);
    } catch (err) {
      console.error("Erro ao baixar certificado", err);
      toast.error(t("cert.downloadError"));
    } finally {
      setBaixando(null);
    }
  };

  // Um PDF por vez: o navegador bloqueia downloads simultaneos e o backend
  // gera cada arquivo sob demanda.
  const baixarTodos = async () => {
    if (certificates.length === 0) return;

    setBaixandoTodos(true);
    let falhas = 0;
    for (const cert of certificates) {
      try {
        await buscarPdf(cert);
      } catch (err) {
        console.error("Erro ao baixar certificado", cert.id, err);
        falhas++;
      }
    }
    setBaixandoTodos(false);

    if (falhas === 0) {
      toast.success(t("cert.downloaded").replace("{count}", String(certificates.length)));
    } else if (falhas === certificates.length) {
      toast.error(t("cert.allError"));
    } else {
      toast.warning(t("cert.partial").replace("{count}", String(certificates.length - falhas)).replace("{failed}", String(falhas)));
    }
  };

  const compartilhar = async (cert: Certificate) => {
    setBaixando(cert.id);
    try {
      const arquivo = await obterPdf(cert);
      const dados = { files: [arquivo], title: cert.title };
      if (navigator.share && navigator.canShare?.(dados)) {
        try {
          await navigator.share(dados);
          return;
        } catch (erro) {
          if (erro instanceof Error && erro.name === "AbortError") return;
        }
      }
      baixarBlob(arquivo, arquivo.name);
      toast.info(t("cert.shareFallback"));
    } catch {
      toast.error(t("cert.shareError"));
    } finally {
      setBaixando(null);
    }
  };

  useEffect(() => {
    let atual = true;
    setLoading(true);
    setError(false);
    api.get<{ id: string; courseTitle: string; issuedAt: string }[]>('/certifications').then(({ data }) => {
      if (atual) setCertificates(data.map(c => ({
        id: c.id, title: c.courseTitle,
        date: c.issuedAt,
        issuer: "Trainify LMS", color: "bg-primary-container text-white",
      })));
    }).catch(() => { if (atual) setError(true); })
      .finally(() => { if (atual) setLoading(false); });
    return () => { atual = false; };
  }, [revisao]);

  if (loading) return <PageContainer><p role="status">{t("cert.loading")}</p></PageContainer>;
  if (error) return <PageContainer><p role="alert">{t("cert.loadError")}</p><Button onClick={() => setRevisao(n => n + 1)}>{t("cert.retry")}</Button></PageContainer>;

  return (
    <PageContainer>
      <PageHeader
        title={t("cert.title")}
        subtitle={t("cert.subtitle")}
        actions={
          <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setRevisao(n => n + 1)}>{t("cert.refresh")}</Button>
          <Button onClick={baixarTodos} disabled={!certificates.length || !!baixando || baixandoTodos}>
            <Download className="w-4 h-4" /> {t("cert.downloadAll")}
          </Button></div>
        }
      />

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-fixed rounded-full flex items-center justify-center text-primary">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
              {t("cert.totalEarned")}
            </p>
            <p className="text-3xl font-display font-bold text-on-surface leading-tight">
              {certificates.length}
            </p>
          </div>
        </div>
      </div>

      {/* Grade */}
      <h3 className="text-xl font-display font-bold mt-10">
        {t("cert.yourCredentials")}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {certificates.length === 0 && <p className="text-on-surface-variant">{t("cert.empty")}</p>}
        {certificates.map((cert) => (
          <div
            key={cert.id}
            className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-1 shadow-sm hover:shadow-md transition-shadow group flex flex-col"
          >
            <div
              className={cn(
                "h-40 rounded-t-xl rounded-b-sm relative flex flex-col justify-between p-5 overflow-hidden",
                cert.color,
              )}
            >
              <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3" />
              <div className="flex justify-between items-start relative z-10">
                <ShieldCheck className="w-8 h-8 opacity-80" />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                  {cert.issuer}
                </p>
                <h4 className="font-display font-bold text-xl leading-tight mt-1">
                  {cert.title || t("cert.untitled")}
                </h4>
              </div>
            </div>

            <div className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest">
                  {t("cert.issued")} {cert.date && new Date(cert.date).toLocaleDateString(language)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => baixarUm(cert)}
                  disabled={!!baixando || baixandoTodos}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container text-on-surface-variant hover:bg-primary-fixed hover:text-primary transition-colors"
                  title={t("cert.downloadPdf")}
                  aria-label={t("cert.downloadPdf")}
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => compartilhar(cert)}
                  disabled={!!baixando || baixandoTodos}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container text-on-surface-variant hover:bg-primary-fixed hover:text-primary transition-colors"
                  title={t("cert.share")}
                  aria-label={t("cert.share")}
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
