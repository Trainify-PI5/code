import {
  Search,
  Phone,
  Mail,
  FileText,
  HelpCircle,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

export default function Support() {
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
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-10">
      {/* Destaque Principal */}
      <div className="bg-primary-container rounded-3xl p-10 md:p-16 text-white text-center relative overflow-hidden shadow-md">
        <div className="absolute right-0 top-0 w-96 h-96 bg-primary-fixed rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/3" />
        <div className="absolute left-0 bottom-0 w-64 h-64 bg-primary rounded-full blur-3xl opacity-50 translate-y-1/2 -translate-x-1/3" />
        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <h1 className="text-4xl md:text-5xl font-display font-bold">
            {t("support.heroTitle")}
          </h1>
          <p className="text-primary-fixed text-lg">
            {t("support.heroSubtitle")}
          </p>
          <div className="relative max-w-lg mx-auto mt-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant w-5 h-5" />
            <input
              type="text"
              placeholder={t("support.searchPlaceholder")}
              className="w-full bg-surface-container-lowest text-on-surface rounded-xl pl-12 pr-4 py-4 focus:outline-none focus:ring-4 focus:ring-primary-fixed/50 transition-all font-sans shadow-lg text-sm"
            />
          </div>
        </div>
      </div>

      {/* Ajuda Rápida */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quickHelp.map((item, idx) => (
          <button
            key={idx}
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
          <h3 className="text-2xl font-display font-bold">
            {t("support.contactTitle")}
          </h3>
          <p className="text-on-surface-variant text-sm">
            {t("support.contactSubtitle")}
          </p>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 space-y-6">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-surface-container rounded-full flex items-center justify-center shrink-0 text-on-surface-variant">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm">{t("support.emailSupport")}</p>
                <p className="text-sm text-primary hover:underline cursor-pointer mt-1">
                  support@trainify.tech
                </p>
                <p className="text-xs text-on-surface-variant mt-1">
                  {t("support.emailResponse")}
                </p>
              </div>
            </div>
            <div className="w-full h-px bg-outline-variant" />
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-surface-container rounded-full flex items-center justify-center shrink-0 text-on-surface-variant">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm">{t("support.phoneSupport")}</p>
                <p className="text-sm font-medium mt-1">1-800-TRAIN-ME</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  {t("support.phoneHours")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Perguntas Frequentes */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-2xl font-display font-bold flex items-center gap-2">
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
    </div>
  );
}
