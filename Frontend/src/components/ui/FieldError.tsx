import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

export default function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return <p id={id} role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium leading-relaxed text-red-800 dark:border-red-400/40 dark:bg-red-950 dark:text-red-200">
    <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
    <span>{children}</span>
  </p>;
}
