import { FormEvent, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, LoaderCircle, Moon, ShieldCheck, Sun, Users } from "lucide-react";
import { API_BASE_URL } from "../config";
import { useThemeStore } from "../store/themeStore";
import logoLight from "../assets/images/logotipo-modo_light.svg";
import logoDark from "../assets/images/logotipo-modo_dark.svg";

const salesApi = axios.create({ baseURL: API_BASE_URL, timeout: 240000 });
const inputClass = "mt-2 w-full min-w-0 rounded-xl border border-outline-variant bg-surface-bright px-4 py-3 text-sm text-on-surface focus:border-primary disabled:opacity-60";

export default function SalesContact() {
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState("");
  const request = useRef<{ payload: string; id: string } | null>(null);
  const submitting = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) || "").trim();
    const payload = {
      firstName: value("firstName"), lastName: value("lastName"), email: value("email"),
      phone: `+${value("phone").replace(/\D/g, "")}`, company: value("company"),
      jobTitle: value("jobTitle"), companySize: value("companySize"), message: value("message"),
      consent: data.get("consent") === "on", website: value("website"),
    };
    if (![payload.firstName, payload.lastName, payload.company, payload.jobTitle].every(Boolean)) {
      setError("Preencha os campos obrigatórios com informações válidas.");
      return;
    }
    if (!/^\+[1-9]\d{7,14}$/.test(payload.phone)) {
      setError("Informe um telefone válido com código do país e DDD. Exemplo: +55 11 99999-9999.");
      return;
    }
    const serialized = JSON.stringify(payload);
    if (request.current?.payload !== serialized) request.current = { payload: serialized, id: crypto.randomUUID() };
    submitting.current = true;
    setSending(true);
    setError("");
    try {
      const response = await salesApi.post("/public/sales-requests", { ...payload, id: request.current.id });
      if (response.status !== 201 || !response.data?.id) throw new Error("Solicitação não confirmada");
      setReceipt(response.data.id);
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      setError(status === 429 ? "Muitas tentativas. Aguarde um minuto e tente novamente."
        : status === 422 || status === 400 ? "Revise os dados preenchidos e tente novamente."
        : "Não foi possível confirmar o envio. Seus dados continuam no formulário; tente novamente.");
    } finally {
      submitting.current = false;
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-bright text-on-surface">
      <header className="border-b border-outline-variant bg-surface-container-lowest">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link to="/" aria-label="Trainify — início" className="shrink-0">
            <img src={logoLight} alt="Trainify" className="h-12 sm:h-14 w-auto dark:hidden" />
            <img src={logoDark} alt="Trainify" className="hidden h-12 sm:h-14 w-auto dark:block" />
          </Link>
          <div className="flex items-center gap-3 sm:gap-6">
            <button type="button" onClick={toggleDarkMode} aria-label={isDarkMode ? "Usar tema claro" : "Usar tema escuro"} className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <Link to="/login" className="text-sm font-semibold text-primary">Já sou cliente <ArrowRight className="ml-1 hidden h-4 w-4 sm:inline" /></Link>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl items-start gap-10 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-16">
        <section className="lg:sticky lg:top-8">
          <Link to="/" className="mb-9 inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary"><ArrowLeft size={16} /> Voltar ao início</Link>
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-primary">Trainify para empresas</p>
          <h1 className="max-w-lg font-display text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl xl:text-6xl">O próximo passo da sua equipe <span className="text-primary">começa aqui.</span></h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-on-surface-variant">Reúna seus treinamentos em um só lugar. Conheça a Trainify e converse com a nossa equipe sobre o LMS para sua empresa.</p>
          <a href="#solicitar" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-container px-5 py-3 text-sm font-semibold text-white lg:hidden">Solicitar demonstração <ArrowRight size={17} /></a>
          <ul className="mt-8 space-y-4">
            {[
              [BookOpen, "Conteúdo organizado", "Cursos, aulas e avaliações no mesmo ambiente."],
              [Users, "Aprendizado acompanhado", "Visibilidade do progresso e dos resultados da equipe."],
              [ShieldCheck, "Um espaço para sua empresa", "Acessos organizados por perfil de usuário."],
            ].map(([Icon, title, description]) => {
              const FeatureIcon = Icon as typeof BookOpen;
              return <li key={String(title)} className="flex items-start gap-4"><span className="rounded-xl bg-primary-fixed p-3 text-primary"><FeatureIcon size={21} /></span><div><h2 className="font-semibold">{String(title)}</h2><p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{String(description)}</p></div></li>;
            })}
          </ul>
          <div className="mt-10 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Como funciona</p>
            <ol className="mt-4 space-y-3 text-sm">
              {["Você conta o que sua empresa precisa.", "Nossa equipe recebe sua solicitação.", "Conversamos sobre demonstração e proposta."].map((step, index) => <li key={step} className="flex items-center gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-xs font-bold text-primary">{index + 1}</span>{step}</li>)}
            </ol>
          </div>
        </section>

        <section id="solicitar" aria-labelledby="contact-title" className="scroll-mt-5 rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl shadow-primary/5 sm:p-9">
          {receipt ? <div role="status" className="py-12 text-center">
            <CheckCircle2 className="mx-auto mb-6 h-14 w-14 text-primary" />
            <h2 id="contact-title" className="font-display text-3xl font-bold">Solicitação recebida!</h2>
            <p className="mt-4 leading-relaxed text-on-surface-variant">Seus dados foram enviados à equipe Trainify para conversar sobre a demonstração e a proposta para sua empresa.</p>
            <p className="mt-6 text-sm font-semibold">Protocolo</p><p className="mt-2 break-all rounded-xl bg-surface-bright p-3 font-mono text-xs">{receipt}</p>
            <p className="mt-5 text-sm text-on-surface-variant">Esta solicitação não gera cobrança nem ativa uma conta.</p>
            <Link to="/" className="mt-8 inline-flex items-center gap-2 font-semibold text-primary">Voltar ao início <ArrowRight size={18} /></Link>
          </div> : <>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Vamos conversar</p>
            <h2 id="contact-title" className="mt-2 font-display text-2xl font-bold sm:text-3xl">Conheça a Trainify</h2>
            <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">Preencha seus dados para solicitar uma demonstração e uma proposta. Campos com * são obrigatórios.</p>
            <form onSubmit={submit} className="mt-7">
              <fieldset disabled={sending} className="grid min-w-0 gap-5 sm:grid-cols-2">
                <label className="text-sm font-semibold">Nome *<input name="firstName" autoComplete="given-name" required maxLength={80} className={inputClass} /></label>
                <label className="text-sm font-semibold">Sobrenome *<input name="lastName" autoComplete="family-name" required maxLength={100} className={inputClass} /></label>
                <label className="text-sm font-semibold sm:col-span-2">E-mail de trabalho *<input name="email" type="email" autoComplete="email" required maxLength={254} className={inputClass} placeholder="voce@empresa.com.br" /></label>
                <label className="text-sm font-semibold sm:col-span-2">Telefone com código do país *<input name="phone" type="tel" autoComplete="tel" required maxLength={25} className={inputClass} placeholder="+55 11 99999-9999" /></label>
                <label className="text-sm font-semibold">Empresa *<input name="company" autoComplete="organization" required maxLength={160} className={inputClass} /></label>
                <label className="text-sm font-semibold">Cargo *<input name="jobTitle" autoComplete="organization-title" required maxLength={100} className={inputClass} /></label>
                <label className="text-sm font-semibold sm:col-span-2">Número de funcionários *<select name="companySize" required defaultValue="" className={inputClass}><option value="" disabled>Selecione uma faixa</option>{["1-10", "11-50", "51-200", "201-500", "501-1000", "1001+"].map(size => <option key={size} value={size}>{size === "1001+" ? "Mais de 1.000" : size.replace("-", " a ")}</option>)}</select></label>
                <label className="text-sm font-semibold sm:col-span-2">O que sua empresa precisa? <span className="font-normal text-on-surface-variant">(opcional)</span><textarea name="message" maxLength={2000} rows={3} className={`${inputClass} resize-y`} placeholder="Conte um pouco sobre seus objetivos com os treinamentos." /></label>
                <div aria-hidden="true" className="hidden"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
                <div className="sm:col-span-2">
                  <details className="mb-4 rounded-xl bg-surface-bright p-4 text-xs leading-relaxed text-on-surface-variant"><summary className="cursor-pointer font-semibold text-primary">Como usaremos seus dados</summary><p className="mt-2">Os dados deste formulário serão armazenados pela Trainify e acessados pela equipe responsável pelo atendimento comercial, para responder à sua solicitação e preparar uma demonstração ou proposta. O envio não cria uma assinatura. Você pode pedir a correção ou exclusão dos dados ao responder ao contato da nossa equipe.</p></details>
                  <label className="flex items-start gap-3 text-xs leading-relaxed text-on-surface-variant"><input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0 accent-primary" /><span>Autorizo o uso dos dados informados para receber contato da Trainify sobre esta solicitação. *</span></label>
                </div>
              </fieldset>
              {error && <p role="alert" className="mt-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{error}</p>}
              <button type="submit" disabled={sending} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-container px-5 py-4 font-semibold text-white transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70">{sending ? <><LoaderCircle size={19} className="animate-spin" /> Enviando solicitação...</> : <>Solicitar demonstração <ArrowRight size={18} /></>}</button>
              <p className="mt-4 flex items-center justify-center gap-2 text-xs text-on-surface-variant"><Check size={14} /> Sem cobrança ao enviar.</p>
            </form>
          </>}
        </section>
      </main>
      <footer className="mx-auto max-w-7xl px-5 pb-8 text-center text-xs text-on-surface-variant">Trainify · Aprendizado que faz sua equipe avançar.</footer>
    </div>
  );
}
