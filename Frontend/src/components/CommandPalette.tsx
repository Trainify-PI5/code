import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Award,
  BarChart3,
  Bell,
  Bot,
  BookOpen,
  Building2,
  Palette,
  CornerDownLeft,
  LayoutDashboard,
  LifeBuoy,
  Moon,
  PlusCircle,
  Search,
  Settings,
  Sun,
  User,
  LogOut,
  Handshake,
  Users as UsersIcon,
} from "lucide-react";
import { cn } from "../lib/utils";
import api from "../services/api";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import {
  achatar,
  montarSecoes,
  proximoIndice,
  type Comando,
} from "../lib/commandPalette";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Paleta de comandos (Ctrl/Cmd+K).
 *
 * Cursos e usuarios sao buscados na primeira abertura e guardados enquanto a
 * pagina viver: a lista nao muda de minuto a minuto, e recarregar a cada
 * abertura deixaria a paleta lenta justamente no uso repetido, que e o ponto
 * dela.
 */
export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { isDarkMode, toggleDarkMode } = useThemeStore();

  const [termo, setTermo] = useState("");
  const [selecionado, setSelecionado] = useState(0);
  const [cursos, setCursos] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [buscou, setBuscou] = useState(false);

  const campo = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLDivElement>(null);

  const ehGestor =
    user?.role === "ADMIN" || user?.role === "SUPER_ADMIN" || user?.role === "MANAGER";
  const ehAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const ensina = ehAdmin || user?.role === "INSTRUCTOR";

  const ir = useCallback(
    (rota: string) => () => {
      navigate(rota);
      onClose();
    },
    [navigate, onClose],
  );

  // As mesmas regras de perfil das rotas: oferecer atalho para uma tela que a
  // pessoa nao pode abrir so levaria ela para /unauthorized.
  const navegacao: Comando[] = useMemo(() => {
    const itens: Comando[] = [
      { id: "nav-home", titulo: "Início", grupo: "navegacao", icone: <LayoutDashboard className="w-4 h-4" />, executar: ir("/"), sinonimos: ["home", "painel"] },
      { id: "nav-courses", titulo: "Cursos", grupo: "navegacao", icone: <BookOpen className="w-4 h-4" />, executar: ir("/courses"), sinonimos: ["treinamentos", "trilhas"] },
      { id: "nav-cert", titulo: "Certificados", grupo: "navegacao", icone: <Award className="w-4 h-4" />, executar: ir("/certifications"), sinonimos: ["diploma"] },
      { id: "nav-ia", titulo: "Assistente IA", grupo: "navegacao", icone: <Bot className="w-4 h-4" />, executar: ir("/assistant"), sinonimos: ["chat", "inteligencia artificial"] },
      { id: "nav-notif", titulo: "Notificações", grupo: "navegacao", icone: <Bell className="w-4 h-4" />, executar: ir("/notifications"), sinonimos: ["avisos", "alertas"] },
      { id: "nav-profile", titulo: "Meu perfil", grupo: "navegacao", icone: <User className="w-4 h-4" />, executar: ir("/profile"), sinonimos: ["conta"] },
      { id: "nav-settings", titulo: "Conta e segurança", grupo: "navegacao", icone: <Settings className="w-4 h-4" />, executar: ir("/settings"), sinonimos: ["configuracoes", "preferencias", "ajustes", "senha"] },
      { id: "nav-support", titulo: "Suporte", grupo: "navegacao", icone: <LifeBuoy className="w-4 h-4" />, executar: ir("/support"), sinonimos: ["ajuda", "faq"] },
    ];

    if (ehGestor) {
      itens.push(
        { id: "nav-dash", titulo: "Análises", grupo: "navegacao", icone: <BarChart3 className="w-4 h-4" />, executar: ir("/dashboards"), sinonimos: ["dashboards", "relatorio", "metricas"] },
        { id: "nav-users", titulo: "Usuários", grupo: "navegacao", icone: <UsersIcon className="w-4 h-4" />, executar: ir("/users"), sinonimos: ["pessoas", "equipe", "acessos", "convites", "convidar"] },
      );
    }
    if (user?.role === "SUPER_ADMIN") {
      itens.push({ id: "nav-sales", titulo: "Comercial", grupo: "navegacao", icone: <Handshake className="w-4 h-4" />, executar: ir("/sales-requests"), sinonimos: ["atendimento", "demonstracao", "solicitacoes"] });
      itens.push({ id: "nav-companies", titulo: "Empresas clientes", grupo: "navegacao", icone: <Building2 className="w-4 h-4" />, executar: ir("/companies"), sinonimos: ["clientes", "empresas", "cadastro"] });
    }
    if (ehAdmin) {
      itens.push(
        { id: "nav-tenant", titulo: "Identidade visual", grupo: "navegacao", icone: <Palette className="w-4 h-4" />, executar: ir("/tenant-settings"), sinonimos: ["empresa", "organizacao", "marca", "logo", "cores"] },
        { id: "nav-audit", titulo: "Auditoria", grupo: "navegacao", icone: <Activity className="w-4 h-4" />, executar: ir("/audit-logs"), sinonimos: ["logs", "seguranca"] },
      );
    }
    if (ensina) {
      itens.push({ id: "nav-builder", titulo: "Criar Curso", grupo: "navegacao", icone: <PlusCircle className="w-4 h-4" />, executar: ir("/courses/builder"), sinonimos: ["novo curso", "editor"] });
    }
    return itens;
  }, [ehGestor, ehAdmin, ensina, ir, user?.role]);

  const acoes: Comando[] = useMemo(
    () => [
      {
        id: "acao-tema",
        titulo: isDarkMode ? "Mudar para o tema claro" : "Mudar para o tema escuro",
        grupo: "acao",
        icone: isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />,
        sinonimos: ["tema", "dark mode", "modo escuro", "aparencia"],
        executar: () => {
          toggleDarkMode();
          onClose();
        },
      },
      {
        id: "acao-sair",
        titulo: "Sair da conta",
        grupo: "acao",
        icone: <LogOut className="w-4 h-4" />,
        sinonimos: ["logout", "deslogar", "encerrar sessao"],
        executar: () => {
          onClose();
          logout();
        },
      },
    ],
    [isDarkMode, toggleDarkMode, logout, onClose],
  );

  const comandos = useMemo(() => {
    const deCursos: Comando[] = cursos.map((curso) => ({
      id: `curso-${curso.id}`,
      titulo: curso.title,
      descricao: curso.description ?? undefined,
      grupo: "curso",
      icone: <BookOpen className="w-4 h-4" />,
      executar: ir(`/courses/${curso.id}`),
    }));

    const deUsuarios: Comando[] = ehGestor
      ? usuarios.map((u) => ({
          id: `usuario-${u.id}`,
          titulo: u.name,
          descricao: u.email,
          grupo: "usuario" as const,
          icone: <User className="w-4 h-4" />,
          executar: ir("/users"),
        }))
      : [];

    return [...navegacao, ...deCursos, ...deUsuarios, ...acoes];
  }, [navegacao, acoes, cursos, usuarios, ehGestor, ir]);

  const secoes = useMemo(() => montarSecoes(comandos, termo), [comandos, termo]);
  const visiveis = useMemo(() => achatar(secoes), [secoes]);

  // Carrega uma vez, na primeira abertura.
  useEffect(() => {
    if (!open || buscou) return;
    setBuscou(true);

    api.get("/courses").then((r) => setCursos(r.data ?? [])).catch(() => {});
    if (ehGestor) {
      api.get("/users").then((r) => setUsuarios(r.data ?? [])).catch(() => {});
    }
  }, [open, buscou, ehGestor]);

  // Cada abertura recomeca limpa, e o foco vai para o campo.
  useEffect(() => {
    if (!open) return;
    setTermo("");
    setSelecionado(0);
    const foco = requestAnimationFrame(() => campo.current?.focus());

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      cancelAnimationFrame(foco);
      document.body.style.overflow = overflowAnterior;
    };
  }, [open]);

  // Digitar volta a selecao para o topo: o primeiro item e o que o Enter executa.
  useEffect(() => {
    setSelecionado(0);
  }, [termo]);

  // Mantem o item escolhido visivel ao navegar so com o teclado.
  useEffect(() => {
    if (!open) return;
    lista.current
      ?.querySelector(`[data-indice="${selecionado}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selecionado, open]);

  if (!open) return null;

  const aoTeclar = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelecionado((i) => proximoIndice(i, visiveis.length, 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelecionado((i) => proximoIndice(i, visiveis.length, -1));
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setSelecionado(0);
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      setSelecionado(Math.max(0, visiveis.length - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      visiveis[selecionado]?.executar();
    }
  };

  const idDoItem = (indice: number) => `comando-${indice}`;
  let indiceCorrente = -1;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm p-4 pt-[10vh] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={aoTeclar}
        className={cn(
          "w-full max-w-xl mx-auto bg-surface-container-lowest border border-outline-variant",
          "rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200",
        )}
      >
        <div className="flex items-center gap-3 px-4 border-b border-outline-variant">
          <Search className="w-5 h-5 text-on-surface-variant shrink-0" aria-hidden="true" />
          <input
            ref={campo}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="lista-comandos"
            aria-activedescendant={visiveis.length ? idDoItem(selecionado) : undefined}
            aria-label="Pesquisar ou digitar um comando"
            autoComplete="off"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Pesquisar ou digitar um comando…"
            className="flex-1 bg-transparent py-4 text-sm text-on-surface placeholder:text-on-surface-variant outline-none"
          />
          <kbd className="hidden sm:block shrink-0 text-[10px] font-bold text-on-surface-variant border border-outline-variant rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        <div
          ref={lista}
          id="lista-comandos"
          role="listbox"
          aria-label="Resultados"
          className="max-h-[50vh] overflow-y-auto p-2"
        >
          {visiveis.length === 0 && (
            <p className="p-8 text-center text-sm text-on-surface-variant">
              Nada encontrado para “{termo}”.
            </p>
          )}

          {secoes.map((secao) => (
            <div key={secao.grupo} className="mb-2 last:mb-0">
              <p className="px-3 py-1.5 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                {secao.rotulo}
              </p>
              {secao.comandos.map((comando) => {
                indiceCorrente += 1;
                const indice = indiceCorrente;
                const ativo = indice === selecionado;
                return (
                  <div
                    key={comando.id}
                    id={idDoItem(indice)}
                    data-indice={indice}
                    role="option"
                    aria-selected={ativo}
                    // o mouse so muda a selecao; quem executa e o clique ou o Enter
                    onMouseMove={() => setSelecionado(indice)}
                    onClick={comando.executar}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors",
                      ativo ? "bg-surface-container text-on-surface" : "text-on-surface-variant",
                    )}
                  >
                    <span className={cn("shrink-0", ativo && "text-primary")}>
                      {comando.icone}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium truncate">
                        {comando.titulo}
                      </span>
                      {comando.descricao && (
                        <span className="block text-xs text-on-surface-variant truncate">
                          {comando.descricao}
                        </span>
                      )}
                    </span>
                    {ativo && (
                      <CornerDownLeft
                        className="w-3.5 h-3.5 shrink-0 text-on-surface-variant"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="hidden sm:flex items-center gap-4 px-4 py-2.5 border-t border-outline-variant text-[11px] text-on-surface-variant">
          <span className="flex items-center gap-1.5">
            <Tecla>↑</Tecla>
            <Tecla>↓</Tecla>
            navegar
          </span>
          <span className="flex items-center gap-1.5">
            <Tecla>↵</Tecla>
            abrir
          </span>
          <span className="flex items-center gap-1.5">
            <Tecla>esc</Tecla>
            fechar
          </span>
        </div>
      </div>
    </div>
  );
}

function Tecla({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="min-w-5 text-center border border-outline-variant rounded px-1 py-0.5 font-sans">
      {children}
    </kbd>
  );
}
