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
  const { t } = useLanguage();

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  
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
        <button className="bg-primary-container text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center gap-2 shadow-sm active:scale-95">
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
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-700">
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
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container text-on-surface-variant hover:bg-primary-fixed hover:text-primary transition-colors"
                  title={t("cert.downloadPdf")}
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container text-on-surface-variant hover:bg-primary-fixed hover:text-primary transition-colors"
                  title={t("cert.share")}
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
