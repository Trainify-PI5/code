import {
  FileText,
  HelpCircle,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { useState } from "react";
import { Button, Modal, PageContainer } from "../components/ui";

export default function Support() {
  const [ajudaAberta, setAjudaAberta] = useState<number | null>(null);
  const { t } = useLanguage();

  const quickHelp = [
    {
      icon: FileText,
      title: t("support.guideTitle"),
      desc: t("support.guideDesc"),
    },
    {
      icon: AlertCircle,
      title: t("support.troubleTitle"),
      desc: t("support.troubleDesc"),
    },
    {
      icon: MessageSquare,
      title: t("support.forumTitle"),
      desc: t("support.forumDesc"),
    },
  ];

  const faqs = [
    { q: t("support.faq1Q"), a: t("support.faq1A") },
    { q: t("support.faq2Q"), a: t("support.faq2A") },
    { q: t("support.faq3Q"), a: t("support.faq3A") },
    { q: t("support.faq4Q"), a: t("support.faq4A") },
  ];

  return (
    <PageContainer className="pb-10">
      {/* Destaque Principal — superficie de marca: fica no roxo profundo nos dois
          temas, como as telas de entrada. Antes era bg-primary-container, que no
          tema escuro clareia para #8353e2: o subtitulo caia para 2.07:1 e o campo
          de busca, preso a uma cor de superficie, virava caixa preta dentro do roxo.
          Aqui o fundo nao depende do tema, entao tudo por cima pode ser branco. */}
      <div className="rounded-3xl px-6 py-12 md:px-16 md:py-14 text-white text-center relative overflow-hidden shadow-md bg-gradient-to-br from-[#1a0550] via-[#2d0d7a] to-[#452097]">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute left-0 bottom-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />
        <div className="relative z-10 max-w-2xl mx-auto space-y-5">
          <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-balance">
            {t("support.heroTitle")}
          </h1>
          <p className="text-white/80 text-base md:text-lg leading-relaxed text-balance">
            {t("support.heroSubtitle")}
          </p>
        </div>
      </div>

      {/* Ajuda Rápida */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quickHelp.map((item, idx) => (
          <button
            key={idx}
            onClick={() => setAjudaAberta(idx)}
            className="bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl text-left hover:border-primary hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 bg-surface-container rounded-full flex items-center justify-center text-on-surface-variant mb-4 group-hover:bg-primary-fixed group-hover:text-primary transition-colors">
              <item.icon className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg mb-2">
              {item.title}
            </h3>
            <p className="text-sm text-on-surface-variant">{item.desc}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10">
        {/* Contato */}
        <div className="space-y-6">
          <h3 className="text-xl font-display font-bold">
            {t("support.contactTitle")}
          </h3>
          <p className="text-on-surface-variant text-sm">
            {t("support.contactSubtitle")}
          </p>
<p className="text-sm text-on-surface-variant">Procure o administrador da sua organização para obter o canal de suporte.</p>
        </div>

        {/* Perguntas Frequentes */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-display font-bold flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-primary" />{" "}
            {t("support.faqTitle")}
          </h3>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl divide-y divide-outline-variant shadow-sm overflow-hidden">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="p-6 hover:bg-surface-bright transition-colors cursor-pointer group"
              >
                <h4 className="font-bold text-on-surface group-hover:text-primary transition-colors">
                  {faq.q}
                </h4>
                <p className="text-sm text-on-surface-variant mt-3 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal
        open={ajudaAberta !== null}
        onClose={() => setAjudaAberta(null)}
        title={ajudaAberta !== null ? quickHelp[ajudaAberta].title : undefined}
        footer={
          <Button onClick={() => setAjudaAberta(null)}>Entendi</Button>
        }
      >
        <p className="text-on-surface-variant">
          {ajudaAberta !== null && quickHelp[ajudaAberta].desc}
        </p>
      </Modal>
    </PageContainer>
  );
}
