import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type DetailItem = { label: string; value: ReactNode; icon?: LucideIcon; full?: boolean };

/** Key/value definition grid (port of the Vite admin DetailList). */
export function DetailList({ items, className }: { items: DetailItem[]; className?: string }) {
  return (
    <dl className={cn("grid gap-x-6 sm:grid-cols-2", className)}>
      {items.map(({ label, value, icon: Icon, full }) => (
        <div key={label} className={cn("border-b border-slate-100 py-3", full && "sm:col-span-2")}>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
          <dd className="mt-1 flex min-w-0 items-start gap-2 break-words text-sm font-medium text-slate-700">
            {Icon && <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />}
            <span className="min-w-0 flex-1 break-words">{value}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
