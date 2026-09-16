import { cn } from "@/lib/cn";
import type { InstallationJob } from "@/lib/api/types";
import { checklistProgress } from "./jobUtils";

/** Checklist bar (phrasing content only, so it can sit inside a button) with "3 of 5 done". `compact` renders only the count (table cells). */
export function ChecklistProgress({
  job,
  compact = false,
  showLabel = true,
  className,
}: {
  job: Pick<InstallationJob, "checklist">;
  compact?: boolean;
  /** Hide the "Checklist" label when a heading already names it. */
  showLabel?: boolean;
  className?: string;
}) {
  const { done, total, percent } = checklistProgress(job);

  if (!total) return <span className={cn("text-sm text-slate-400", className)}>No checklist</span>;

  const label = `${done} of ${total} done`;

  if (compact) {
    return (
      <span className={cn("whitespace-nowrap text-sm tabular-nums", done === total && "text-emerald-700", className)}>
        {done}/{total}
      </span>
    );
  }

  return (
    <span className={cn("block space-y-1.5", className)}>
      <span className={cn("flex items-center text-sm", showLabel ? "justify-between" : "justify-end")}>
        {showLabel && <span className="font-medium text-slate-600">Checklist</span>}
        <span className="tabular-nums text-slate-500">{label}</span>
      </span>
      <span
        role="progressbar"
        aria-label="Checklist progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-valuetext={label}
        className="block h-2 w-full overflow-hidden rounded-full bg-slate-100"
      >
        <span
          className={cn("block h-full rounded-full transition-all", done === total ? "bg-emerald-500" : "bg-brand-600")}
          style={{ width: `${percent}%` }}
        />
      </span>
    </span>
  );
}
