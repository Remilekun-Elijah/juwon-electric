import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Skeleton } from "./Skeleton";

const tileTones = {
  brand: "bg-brand-50 text-brand-700",
  success: "bg-green-50 text-green-600",
  warning: "bg-amber-50 text-amber-600",
  danger: "bg-red-50 text-red-600",
  info: "bg-blue-50 text-blue-600",
};

const linkClasses =
  "mt-4 inline-flex items-center gap-1 rounded-sm text-xs font-semibold text-brand-700 transition-colors hover:text-brand-800 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2";

/**
 * StatCard (KPI). Props: label, value, helper, icon (lucide component), tone (brand|success|warning|danger|info),
 * href (route path → next/link) or onClick (button), linkLabel (default "View"), loading (skeleton value), className.
 */
export function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "brand",
  href,
  onClick,
  linkLabel = "View",
  loading = false,
  className,
}) {
  const linkContent = (
    <>
      {linkLabel}
      <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
    </>
  );

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-5 shadow-elev-1 transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {Icon && (
          <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", tileTones[tone] ?? tileTones.brand)}>
            <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-9 w-24" />
      ) : (
        <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</p>
      )}
      {helper && <p className="mt-1 text-xs text-slate-400">{helper}</p>}
      {href ? (
        <Link href={href} className={linkClasses}>
          {linkContent}
        </Link>
      ) : (
        onClick && (
          <button type="button" onClick={onClick} className={linkClasses}>
            {linkContent}
          </button>
        )
      )}
    </div>
  );
}

export default StatCard;
