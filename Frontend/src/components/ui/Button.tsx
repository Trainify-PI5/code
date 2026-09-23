import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

// bg-primary-container (e nao bg-primary) porque no tema escuro --primary e
// um roxo claro: texto branco em cima dele ficaria ilegivel.
const variantes: Record<Variant, string> = {
  primary: "bg-primary-container text-white hover:opacity-90 shadow-sm",
  secondary:
    "border border-outline-variant text-on-surface hover:bg-surface-container",
  ghost: "text-on-surface-variant hover:bg-surface-container",
  danger:
    "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10",
};

const tamanhos: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children?: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold transition-all",
        "active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100",
        variantes[variant],
        tamanhos[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    />
  );
}
