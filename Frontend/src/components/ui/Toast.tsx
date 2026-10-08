import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "../../lib/utils";

type Tom = "success" | "error" | "warning" | "info";

interface Aviso {
  id: number;
  tom: Tom;
  texto: string;
}

interface ToastAPI {
  /** Atalhos por tom. Retornam nada — o aviso some sozinho. */
  success: (texto: string) => void;
  error: (texto: string) => void;
  warning: (texto: string) => void;
  info: (texto: string) => void;
}

const ToastContext = createContext<ToastAPI | undefined>(undefined);

const estilos: Record<Tom, string> = {
  success:
    "border-green-200 bg-green-50 text-green-800 dark:border-green-500/30 dark:bg-green-950 dark:text-green-300",
  error:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-950 dark:text-red-300",
  warning:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-950 dark:text-amber-300",
  info: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-950 dark:text-blue-300",
};

const icones: Record<Tom, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const DURACAO = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const proximoId = useRef(0);

  const remover = useCallback((id: number) => {
    setAvisos((atuais) => atuais.filter((a) => a.id !== id));
  }, []);

  const mostrar = useCallback(
    (tom: Tom, texto: string) => {
      const id = proximoId.current++;
      setAvisos((atuais) => [...atuais, { id, tom, texto }]);
      window.setTimeout(() => remover(id), DURACAO);
    },
    [remover],
  );

  const api = useMemo<ToastAPI>(
    () => ({
      success: (t) => mostrar("success", t),
      error: (t) => mostrar("error", t),
      warning: (t) => mostrar("warning", t),
      info: (t) => mostrar("info", t),
    }),
    [mostrar],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* aria-live: o leitor de tela anuncia sem roubar o foco */}
      <div
        aria-live="polite"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 w-[min(calc(100vw-2rem),24rem)] pointer-events-none"
      >
        {avisos.map((aviso) => {
          const Icone = icones[aviso.tom];
          return (
            <div
              key={aviso.id}
              role={aviso.tom === "error" ? "alert" : "status"}
              className={cn(
                "w-full flex items-start gap-3 rounded-xl border border-l-4 px-4 py-3 text-sm font-medium leading-relaxed shadow-lg",
                "pointer-events-auto animate-in slide-in-from-bottom-4 fade-in duration-200",
                estilos[aviso.tom],
              )}
            >
              <Icone className="w-5 h-5 shrink-0 mt-px" />
              <p className="flex-1 min-w-0">{aviso.texto}</p>
              <button
                type="button"
                onClick={() => remover(aviso.id)}
                aria-label="Fechar aviso"
                className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastAPI {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast precisa estar dentro de um ToastProvider");
  }
  return ctx;
}
