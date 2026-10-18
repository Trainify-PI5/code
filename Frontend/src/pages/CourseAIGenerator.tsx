import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, FileText, Loader2, Plus, Sparkles, Trash2, Upload, X } from 'lucide-react';
import api from '../services/api';
import { requestError } from '../lib/requestError';
import MarkdownText from '../components/MarkdownText';
import { Alert, Button, Card, ConfirmDialog, PageContainer, PageHeader, Textarea, useToast } from '../components/ui';

interface FonteAula { document: string; pages?: string }
interface AulaProposta { title: string; topics?: string[]; content: string; sources?: FonteAula[] }
interface ModuloProposta { title: string; objective?: string; lessons: AulaProposta[] }
export interface PropostaCurso { title: string; description: string; modules: ModuloProposta[]; warnings?: string[] }

interface Rascunho {
  id: string;
  status: 'PROCESSING' | 'READY' | 'FAILED' | 'APPROVED' | 'DISCARDED';
  progress: number;
  step?: string;
  documentNames?: string[];
  proposal?: PropostaCurso;
  error?: string;
  courseId?: string;
}

/** Tamanho do curso: faixa de módulos que a IA pode propor. */
const TAMANHOS = {
  curto: { label: 'Curto (1 a 2 módulos)', min: 1, max: 2 },
  medio: { label: 'Médio (2 a 4 módulos)', min: 2, max: 4 },
  completo: { label: 'Completo (3 a 6 módulos)', min: 3, max: 6 },
} as const;

// Os mesmos limites do backend (CourseGenerationService): os documentos sao
// carregados inteiros na memoria do servidor para irem ate a IA.
const LIMITE_ARQUIVO = 10 * 1024 * 1024;
const LIMITE_TOTAL = 15 * 1024 * 1024;
const MAX_ARQUIVOS = 5;
const INTERVALO_CONSULTA_MS = 4000;

const tamanhoLegivel = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/**
 * "Criar curso com IA": o instrutor envia os documentos da empresa, a IA
 * propõe o curso e o instrutor revisa e aprova. O id do rascunho fica na URL,
 * então dá para sair da página durante a geração e voltar depois.
 */
export default function CourseAIGenerator() {
  const [params, setParams] = useSearchParams();
  const rascunhoId = params.get('rascunho');
  const navigate = useNavigate();
  const toast = useToast();

  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);

  const carregar = useCallback(async (id: string) => {
    try {
      const { data } = await api.get<Rascunho>(`/ai/course-drafts/${id}`);
      setRascunho(data);
      setErroCarga(null);
    } catch (e) {
      setErroCarga(requestError(e, 'Não foi possível consultar a geração do curso.'));
    }
  }, []);

  useEffect(() => {
    setRascunho(null);
    if (rascunhoId) carregar(rascunhoId);
  }, [rascunhoId, carregar]);

  // Enquanto a IA trabalha, consulta o andamento de tempos em tempos
  useEffect(() => {
    if (!rascunhoId || rascunho?.status !== 'PROCESSING') return;
    const timer = setInterval(() => carregar(rascunhoId), INTERVALO_CONSULTA_MS);
    return () => clearInterval(timer);
  }, [rascunhoId, rascunho?.status, carregar]);

  const recomecar = () => setParams({});

  return (
    <PageContainer>
      <PageHeader
        title="Criar curso com IA"
        subtitle="Envie os documentos de treinamento da empresa: a IA propõe módulos e aulas, e você revisa antes de criar o curso."
        icon={<Sparkles className="w-6 h-6" />}
      />

      {erroCarga && <Alert tone="error">{erroCarga}</Alert>}

      {!rascunhoId && <EnviarDocumentos onIniciado={(id) => setParams({ rascunho: id })} />}

      {rascunhoId && !rascunho && !erroCarga && (
        <Card className="flex items-center gap-3 text-on-surface-variant">
          <Loader2 className="w-5 h-5 animate-spin" /> Carregando...
        </Card>
      )}

      {rascunho?.status === 'PROCESSING' && <Andamento rascunho={rascunho} />}

      {rascunho?.status === 'FAILED' && (
        <Card className="space-y-4">
          <Alert tone="error">{rascunho.error || 'A IA não conseguiu gerar o curso.'}</Alert>
          <Button onClick={recomecar}>Enviar documentos de novo</Button>
        </Card>
      )}

      {rascunho?.status === 'READY' && rascunho.proposal && (
        <Revisao
          rascunho={rascunho}
          onAprovado={(courseId) => {
            toast.success('Curso criado em rascunho. Revise e publique quando quiser.');
            navigate(`/courses/builder/${courseId}`);
          }}
          onDescartado={() => {
            toast.success('Rascunho descartado.');
            recomecar();
          }}
        />
      )}

      {rascunho?.status === 'APPROVED' && rascunho.courseId && (
        <Card className="space-y-4">
          <Alert tone="success">Este rascunho já virou um curso.</Alert>
          <Button onClick={() => navigate(`/courses/builder/${rascunho.courseId}`)}>Abrir o curso</Button>
        </Card>
      )}

      {rascunho?.status === 'DISCARDED' && (
        <Card className="space-y-4">
          <Alert tone="info">Este rascunho foi descartado.</Alert>
          <Button onClick={recomecar}>Começar outro</Button>
        </Card>
      )}
    </PageContainer>
  );
}

// ── 1. Enviar ──

function EnviarDocumentos({ onIniciado }: { onIniciado: (id: string) => void }) {
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [orientacao, setOrientacao] = useState('');
  const [tamanho, setTamanho] = useState<keyof typeof TAMANHOS>('medio');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  const adicionar = (lista: FileList | null) => {
    if (!lista) return;
    const novos = Array.from(lista);
    const grandes = novos.filter((f) => f.size > LIMITE_ARQUIVO);
    if (grandes.length) {
      setErro(`Arquivo grande demais (máximo ${tamanhoLegivel(LIMITE_ARQUIVO)}): ${grandes.map((f) => f.name).join(', ')}`);
    } else {
      setErro(null);
    }
    setArquivos((atuais) => {
      const nomes = new Set(atuais.map((f) => f.name));
      const cabem = novos.filter((f) => f.size <= LIMITE_ARQUIVO && !nomes.has(f.name));
      const juntos = [...atuais, ...cabem].slice(0, MAX_ARQUIVOS);

      // Avisar aqui evita subir tudo para o servidor so para ser recusado
      const total = juntos.reduce((soma, f) => soma + f.size, 0);
      if (total > LIMITE_TOTAL) {
        setErro(`Os documentos somam ${tamanhoLegivel(total)} e o limite é ${tamanhoLegivel(LIMITE_TOTAL)}. Remova algum arquivo.`);
      }
      return juntos;
    });
    if (entrada.current) entrada.current.value = '';
  };

  const gerar = async () => {
    setEnviando(true);
    setErro(null);
    try {
      const form = new FormData();
      arquivos.forEach((f) => form.append('files', f));
      if (orientacao.trim()) form.append('instructions', orientacao.trim());
      form.append('minModules', String(TAMANHOS[tamanho].min));
      form.append('maxModules', String(TAMANHOS[tamanho].max));
      const { data } = await api.post<Rascunho>('/ai/course-drafts', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onIniciado(data.id);
    } catch (e) {
      setErro(requestError(e, 'A IA está indisponível no momento. Tente de novo em instantes.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Card className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-on-surface">Documentos</h2>
        <p className="text-sm text-on-surface-variant">
          PDFs com texto (não escaneados), .txt ou .md. Até 5 arquivos, 10 MB cada e 15 MB no total.
        </p>
      </div>

      <button
        type="button"
        onClick={() => entrada.current?.click()}
        className="w-full border-2 border-dashed border-outline-variant rounded-xl p-6 flex flex-col items-center gap-2 text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
      >
        <Upload className="w-6 h-6" />
        <span className="text-sm font-medium">Escolher documentos</span>
      </button>
      <input
        ref={entrada}
        type="file"
        multiple
        accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
        className="hidden"
        aria-label="Documentos do curso"
        onChange={(e) => adicionar(e.target.files)}
      />

      {arquivos.length > 0 && (
        <ul className="divide-y divide-outline-variant border border-outline-variant rounded-xl" aria-label="Documentos escolhidos">
          {arquivos.map((f) => (
            <li key={f.name} className="flex items-center gap-3 px-4 py-2 text-sm">
              <FileText className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
              <span className="flex-1 min-w-0 truncate text-on-surface">{f.name}</span>
              <span className="text-on-surface-variant shrink-0">{tamanhoLegivel(f.size)}</span>
              <button
                type="button"
                aria-label={`Remover ${f.name}`}
                onClick={() => setArquivos((a) => a.filter((x) => x !== f))}
                className="p-1 rounded hover:bg-surface-container text-on-surface-variant"
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 md:grid-cols-[1fr_16rem]">
        <Textarea
          label="Orientação para a IA (opcional)"
          value={orientacao}
          maxLength={500}
          rows={3}
          placeholder="Ex.: curso para operadores de armazém, com foco nas obrigações do trabalhador"
          onChange={(e) => setOrientacao(e.target.value)}
        />
        <label className="flex flex-col gap-1 text-sm font-medium text-on-surface">
          Tamanho do curso
          <select
            value={tamanho}
            onChange={(e) => setTamanho(e.target.value as keyof typeof TAMANHOS)}
            className="bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-sm font-normal"
          >
            {Object.entries(TAMANHOS).map(([chave, t]) => (
              <option key={chave} value={chave}>{t.label}</option>
            ))}
          </select>
        </label>
      </div>

      {erro && <Alert tone="error">{erro}</Alert>}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={gerar} disabled={!arquivos.length || enviando}>
          {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {enviando ? 'Enviando...' : 'Gerar proposta de curso'}
        </Button>
        <span className="text-xs text-on-surface-variant">
          Leva alguns minutos (cerca de 2 minutos por documento). Nada é publicado sem a sua revisão.
        </span>
      </div>
    </Card>
  );
}

// ── 2. Acompanhar ──

function Andamento({ rascunho }: { rascunho: Rascunho }) {
  return (
    <Card className="space-y-4" aria-live="polite">
      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-primary" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-on-surface">A IA está montando o curso</p>
          <p className="text-sm text-on-surface-variant truncate">{rascunho.step || 'Começando'}</p>
        </div>
        <span className="text-sm font-semibold text-primary">{rascunho.progress}%</span>
      </div>
      <div
        className="h-2 rounded-full bg-surface-container overflow-hidden"
        role="progressbar"
        aria-valuenow={rascunho.progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Andamento da geração"
      >
        <div className="h-full bg-primary-container transition-all duration-500" style={{ width: `${rascunho.progress}%` }} />
      </div>
      {!!rascunho.documentNames?.length && (
        <p className="text-xs text-on-surface-variant">Documentos: {rascunho.documentNames.join(', ')}</p>
      )}
      <p className="text-xs text-on-surface-variant">
        Pode sair desta página: a geração continua, e o endereço atual traz você de volta ao rascunho.
      </p>
    </Card>
  );
}

// ── 3. Revisar e aprovar ──

function Revisao({ rascunho, onAprovado, onDescartado }: {
  rascunho: Rascunho;
  onAprovado: (courseId: string) => void;
  onDescartado: () => void;
}) {
  const [proposta, setProposta] = useState<PropostaCurso>(rascunho.proposal!);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [descartarAberto, setDescartarAberto] = useState(false);

  const alterarModulo = (m: number, mudanca: Partial<ModuloProposta>) =>
    setProposta((p) => ({ ...p, modules: p.modules.map((mod, i) => (i === m ? { ...mod, ...mudanca } : mod)) }));

  const alterarAula = (m: number, a: number, mudanca: Partial<AulaProposta>) =>
    alterarModulo(m, { lessons: proposta.modules[m].lessons.map((aula, i) => (i === a ? { ...aula, ...mudanca } : aula)) });

  const totalAulas = proposta.modules.reduce((soma, m) => soma + m.lessons.length, 0);

  const aprovar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      await api.put(`/ai/course-drafts/${rascunho.id}/proposal`, proposta);
      const { data } = await api.post<Rascunho>(`/ai/course-drafts/${rascunho.id}/approve`);
      onAprovado(data.courseId!);
    } catch (e) {
      setErro(requestError(e, 'Não foi possível criar o curso. Tente de novo.'));
    } finally {
      setSalvando(false);
    }
  };

  const descartar = async () => {
    try {
      await api.delete(`/ai/course-drafts/${rascunho.id}`);
      onDescartado();
    } catch (e) {
      setErro(requestError(e, 'Não foi possível descartar o rascunho.'));
    }
  };

  return (
    <div className="space-y-5">
      <Alert tone="info">
        Revise a proposta: edite títulos e textos, remova o que não servir e confira as fontes de cada aula.
        Ao criar, o curso fica em <b>rascunho</b>, com uma avaliação vazia em cada módulo para você gerar o quiz.
      </Alert>

      {!!proposta.warnings?.length && (
        <Alert tone="warning">{proposta.warnings.join(' ')}</Alert>
      )}

      <Card className="space-y-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-on-surface">
          Título do curso
          <input
            value={proposta.title}
            maxLength={200}
            onChange={(e) => setProposta({ ...proposta, title: e.target.value })}
            className="bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-base font-semibold"
          />
        </label>
        <Textarea
          label="Descrição"
          rows={2}
          value={proposta.description}
          onChange={(e) => setProposta({ ...proposta, description: e.target.value })}
        />
        <p className="text-xs text-on-surface-variant">
          {proposta.modules.length} módulos · {totalAulas} aulas
        </p>
      </Card>

      {proposta.modules.map((modulo, m) => (
        <Card key={m} className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="mt-2 text-xs font-bold text-primary shrink-0">MÓDULO {m + 1}</span>
            <div className="flex-1 min-w-0 space-y-1">
              <input
                aria-label={`Título do módulo ${m + 1}`}
                value={modulo.title}
                maxLength={200}
                onChange={(e) => alterarModulo(m, { title: e.target.value })}
                className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 font-semibold"
              />
              {modulo.objective && <p className="text-xs text-on-surface-variant px-1">{modulo.objective}</p>}
            </div>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Remover o módulo ${modulo.title}`}
              disabled={proposta.modules.length === 1}
              onClick={() => setProposta({ ...proposta, modules: proposta.modules.filter((_, i) => i !== m) })}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-3 pl-0 md:pl-8">
            {modulo.lessons.map((aula, a) => (
              <AulaEditavel
                key={a}
                aula={aula}
                podeRemover={modulo.lessons.length > 1}
                onChange={(mudanca) => alterarAula(m, a, mudanca)}
                onRemover={() => alterarModulo(m, { lessons: modulo.lessons.filter((_, i) => i !== a) })}
              />
            ))}
          </div>
        </Card>
      ))}

      {erro && <Alert tone="error">{erro}</Alert>}

      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="secondary" onClick={() => setDescartarAberto(true)} disabled={salvando}>
          Descartar
        </Button>
        <Button onClick={aprovar} disabled={salvando}>
          {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {salvando ? 'Criando o curso...' : 'Criar curso em rascunho'}
        </Button>
      </div>

      <ConfirmDialog
        open={descartarAberto}
        onClose={() => setDescartarAberto(false)}
        onConfirm={descartar}
        tone="danger"
        title="Descartar a proposta"
        message="A proposta gerada pela IA será apagada. Os documentos não ficam guardados."
        confirmLabel="Descartar"
      />
    </div>
  );
}

function AulaEditavel({ aula, podeRemover, onChange, onRemover }: {
  aula: AulaProposta;
  podeRemover: boolean;
  onChange: (mudanca: Partial<AulaProposta>) => void;
  onRemover: () => void;
}) {
  const [aberta, setAberta] = useState(false);
  const [editando, setEditando] = useState(false);

  return (
    <div className="border border-outline-variant rounded-xl">
      <div className="flex items-center gap-2 p-3">
        <BookOpen className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
        <input
          aria-label="Título da aula"
          value={aula.title}
          maxLength={200}
          onChange={(e) => onChange({ title: e.target.value })}
          className="flex-1 min-w-0 bg-transparent border-b border-transparent focus:border-primary outline-none text-sm font-medium text-on-surface py-1"
        />
        <Button variant="ghost" size="sm" onClick={() => setAberta(!aberta)} aria-expanded={aberta}>
          {aberta ? 'Fechar' : 'Ver texto'}
        </Button>
        <Button variant="ghost" size="sm" aria-label={`Remover a aula ${aula.title}`} disabled={!podeRemover} onClick={onRemover}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {!!aula.sources?.length && (
        <p className="px-3 pb-2 text-xs text-on-surface-variant">
          Fontes: {aula.sources.map((f) => (f.pages ? `${f.document} (p. ${f.pages})` : f.document)).join('; ')}
        </p>
      )}

      {aberta && (
        <div className="border-t border-outline-variant p-3 space-y-2">
          <div className="flex gap-2">
            <Button size="sm" variant={editando ? 'ghost' : 'secondary'} onClick={() => setEditando(false)}>Visualizar</Button>
            <Button size="sm" variant={editando ? 'secondary' : 'ghost'} onClick={() => setEditando(true)}>Editar</Button>
          </div>
          {editando ? (
            <Textarea
              aria-label={`Texto da aula ${aula.title}`}
              rows={16}
              value={aula.content}
              onChange={(e) => onChange({ content: e.target.value })}
              className="font-mono text-xs"
            />
          ) : (
            <div className="text-sm text-on-surface">
              <MarkdownText text={aula.content} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
