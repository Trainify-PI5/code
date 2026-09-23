import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type Padding = "none" | "sm" | "md" | "lg";

const paddings: Record<Padding, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: Padding;
  /** Realce sutil ao passar o mouse — para cards que sao clicaveis. */
  interactive?: boolean;
}

export default function Card({
  padding = "md",
  interactive = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm",
        paddings[padding],
        interactive && "transition-all duration-200 hover:shadow-md",
        className,
      )}
      {...props}
    />
  );
}
