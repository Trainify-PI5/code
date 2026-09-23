import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Icone exibido a esquerda, dentro do campo. */
  icon?: ReactNode;
  /** Mensagem de erro: destaca a borda e e anunciada por leitores de tela. */
  error?: string;
  /** Classe do wrapper — util quando o campo entra numa linha flex. */
  wrapperClassName?: string;
}

export default function Input({
  label,
  icon,
  error,
  id,
  className,
  wrapperClassName,
  ...props
}: InputProps) {
  // useId garante o vinculo label/input mesmo sem id explicito — sem isso o
  // campo chega ao leitor de tela apenas com o placeholder.
  const gerado = useId();
  const inputId = id || gerado;
  const erroId = `${inputId}-erro`;

  return (
    <div className={cn("space-y-2", wrapperClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? erroId : undefined}
          className={cn(
            "w-full bg-surface-container-lowest border rounded-xl py-3 text-sm",
            "text-on-surface placeholder:text-outline-variant outline-none transition-all",
            "focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed",
            icon ? "pl-10 pr-4" : "px-4",
            error ? "border-red-400 dark:border-red-500/60" : "border-outline-variant",
            className,
          )}
          {...props}
        />
      </div>

      {error && (
        <p id={erroId} className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
