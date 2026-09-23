import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

type Tom = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

// Mesma regra do Alert: a variante dark anda junto do tom claro.
const tons: Record<Tom, string> = {
  neutral: "bg-surface-container text-on-surface-variant",
  brand: "bg-primary-fixed text-primary",
  success:
    "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300",
  warning:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tom;
  children?: ReactNode;
}

export default function Badge({
  tone = "neutral",
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
        tons[tone],
        className,
      )}
      {...props}
    />
  );
}
