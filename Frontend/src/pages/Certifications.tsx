import { useState, useEffect } from "react";
import {
  Award,
  Download,
  Clock,
  Star,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useLanguage } from "../contexts/LanguageContext";
import { useToast } from "../components/ui";
import api from "../services/api";
import { baixarBlob } from "../lib/download";

interface Certificate {
  id: string;
  title: string;
  date: string;
  issuer: string;
  skill: string;
  color: string;
  score: number;
}

export default function Certifications() {
  const toast = useToast();
  const { t } = useLanguage();

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [baixando, setBaixando] = useState<string | null>(null);
  const [baixandoTodos, setBaixandoTodos] = useState(false);

  const buscarPdf = async (cert: Certificate) => {
    const { data } = await api.get(`/certifications/${cert.id}/pdf`, {
      responseType: "blob",
    });
    const nome = cert.title.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
    baixarBlob(data, `certificado-${nome || cert.id}.pdf`);
  };

  const baixarUm = async (cert: Certificate) => {
    setBaixando(cert.id);
    try {
      await buscarPdf(cert);
    } catch (err) {
      console.error("Erro ao baixar certificado", err);
      toast.error("Não foi possível baixar o certificado.");
    } finally {
      setBaixando(null);
    }
  };

  // Um PDF por vez: o navegador bloqueia downloads simultaneos e o backend
  // gera cada arquivo sob demanda.
  const baixarTodos = async () => {
    if (certificates.length === 0) {
      toast.info("Você ainda não tem certificados.");
      return;
    }

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
      toast.success(`${certificates.length} certificado(s) baixado(s).`);
    } else if (falhas === certificates.length) {
      toast.error("Não foi possível baixar os certificados.");
    } else {
      toast.warning(`${certificates.length - falhas} baixado(s), ${falhas} com erro.`);
    }
  };

  // Web Share onde existir (celular), senao copia o link para a area de
  // transferencia — os dois caminhos sao do proprio navegador.
  const compartilhar = async (cert: Certificate) => {
    const url = `${window.location.origin}/certifications`;
    const texto = `Concluí "${cert.title}" na Trainify.`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "Certificado Trainify", text: texto, url });
        return;
      } catch {
        return; // usuario cancelou o compartilhamento
      }
    }

    try {
      await navigator.clipboard.writeText(`${texto} ${url}`);
      toast.success("Link copiado para a área de transferência.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };
  
  useEffect(() => {
    import("../services/api").then(api => {
      api.default.get('/certifications').then(res => {
        const mapped = res.data.map((c: any) => ({
          id: c.id,
          title: c.courseTitle || "Curso sem Título",
          date: c.issuedAt ? new Date(c.issuedAt).toLocaleDateString() : "",
          issuer: "Trainify LMS",
          skill: "Conhecimento Geral", // mock fallback
          color: "bg-primary-container text-white",
          score: c.score || 100,
        }));
        setCertificates(mapped);
      }).catch(console.error);
    });
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex justify-between items-end border-b border-outline-variant pb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-on-surface">
            {t("cert.title")}
          </h1>
          <p className="text-on-surface-variant">{t("cert.subtitle")}</p>
        </div>
        <button onClick={baixarTodos}
          disabled={baixandoTodos} className="bg-primary-container text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center gap-2 shadow-sm active:scale-95">
          <Download className="w-4 h-4" /> {t("cert.downloadAll")}
        </button>
      </div>

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
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-surface-container rounded-full flex items-center justify-center text-on-surface-variant">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
              {t("cert.hoursLogged")}
            </p>
            <p className="text-3xl font-display font-bold text-on-surface leading-tight">
              {certificates.length * 4}h
            </p>
          </div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-700 dark:bg-green-500/10 dark:text-green-300">
            <Star className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
              {t("cert.avgScore")}
            </p>
            <p className="text-3xl font-display font-bold text-on-surface leading-tight">
              {certificates.length > 0 ? Math.round(certificates.reduce((acc, c) => acc + c.score, 0) / certificates.length) : 0}%
            </p>
          </div>
        </div>
      </div>

      {/* Grade */}
      <h3 className="text-xl font-display font-bold mt-10">
        {t("cert.yourCredentials")}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2 py-1 rounded backdrop-blur-sm">
                  {cert.skill}
                </span>
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                  {cert.issuer}
                </p>
                <h4 className="font-display font-bold text-xl leading-tight mt-1">
                  {cert.title}
                </h4>
              </div>
            </div>

            <div className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest">
                  {t("cert.issued")} {cert.date}
                </p>
                <p className="text-sm font-medium mt-1">
                  {t("cert.score")}: {cert.score}%
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => baixarUm(cert)}
                  disabled={baixando === cert.id}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container text-on-surface-variant hover:bg-primary-fixed hover:text-primary transition-colors"
                  title={t("cert.downloadPdf")}
                  aria-label={t("cert.downloadPdf")}
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => compartilhar(cert)}
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
    </div>
  );
}
