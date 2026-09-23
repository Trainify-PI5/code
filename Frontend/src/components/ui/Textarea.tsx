import { useId, type TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export default function Textarea({
  label,
  error,
  id,
  className,
  rows = 4,
  ...props
}: TextareaProps) {
  const gerado = useId();
  const campoId = id || gerado;
  const erroId = `${campoId}-erro`;

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={campoId}
          className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest"
        >
          {label}
        </label>
      )}

      <textarea
        id={campoId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? erroId : undefined}
        className={cn(
          "w-full bg-surface-container-lowest border rounded-xl px-4 py-3 text-sm resize-none",
          "text-on-surface placeholder:text-outline-variant outline-none transition-all",
          "focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed",
          error ? "border-red-400 dark:border-red-500/60" : "border-outline-variant",
          className,
        )}
        {...props}
      />

      {error && (
        <p id={erroId} className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
