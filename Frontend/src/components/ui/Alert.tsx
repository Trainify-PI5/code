import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

type Tom = "error" | "warning" | "success" | "info";

// Cada tom carrega a variante dark junto. Sem isso, um bg-{cor}-50 vira uma
// mancha quase branca sobre a superficie escura do app (luminosidade 0,08).
const tons: Record<Tom, string> = {
  error:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
  warning:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  success:
    "border-green-200 bg-green-50 text-green-800 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300",
  info: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300",
};

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tom;
  icon?: ReactNode;
  children?: ReactNode;
}

export default function Alert({
  tone = "info",
  icon,
  className,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-xl border px-4 py-3 text-sm",
        tons[tone],
        className,
      )}
      {...props}
    >
      {icon && <span className="shrink-0 mt-0.5">{icon}</span>}
      <div className="flex-1">{children}</div>
    </div>
  );
}
