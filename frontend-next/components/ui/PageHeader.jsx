import { cn } from "@/lib/cn";

/**
 * PageHeader. Props: eyebrow (small uppercase brand label), title, description, actions (right-side slot),
 * titleAs (default "h1"), className.
 */
export function PageHeader({ eyebrow, title, description, actions, titleAs: Title = "h1", className }) {
  return (
    <header className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700">{eyebrow}</p>
        )}
        <Title className={cn("text-2xl font-bold tracking-tight text-slate-900", eyebrow && "mt-1")}>{title}</Title>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export default PageHeader;
