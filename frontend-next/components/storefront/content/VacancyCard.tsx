import Link from "next/link";
import { ArrowRight, Banknote, Building2, CalendarDays, MapPin } from "lucide-react";
import { Badge } from "@/components/ui";
import type { PublicVacancy } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { richTextToPlain } from "@/lib/sanitize";
import { storeArrowNudge, storeCard, storeFocus, storeHoverLift } from "@/lib/storefront/styles";
import { employmentTypeLabel, formatPostedDate, vacancyPath } from "@/lib/vacancies";

/** Open role card: title, department, location, employment type, salary range and posted date. Lifts on hover. Server component. */
export default function VacancyCard({ vacancy }: { vacancy: PublicVacancy }) {
  const type = employmentTypeLabel(vacancy.employmentType);
  const posted = formatPostedDate(vacancy.postedAt);
  const excerpt = richTextToPlain(vacancy.descriptionHtml, 180);
  const meta = [
    vacancy.department && { icon: Building2, label: "Department", value: vacancy.department },
    vacancy.location && { icon: MapPin, label: "Location", value: vacancy.location },
    vacancy.salaryRange && { icon: Banknote, label: "Salary", value: vacancy.salaryRange },
  ].filter((item): item is { icon: typeof MapPin; label: string; value: string } => Boolean(item));

  return (
    <article className={cn(storeCard, storeHoverLift, "group relative flex h-full flex-col p-5 sm:p-6")}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="success" dot>
          Open role
        </Badge>
        {type && <Badge tone="brand">{type}</Badge>}
      </div>
      <h2 className="mt-3 text-lg font-semibold leading-snug tracking-tight text-slate-900 sm:text-xl">
        <Link
          href={vacancyPath(vacancy)}
          className={cn("rounded-sm transition-colors after:absolute after:inset-0 after:rounded-2xl after:content-[''] group-hover:text-brand-700", storeFocus)}
        >
          {vacancy.title}
        </Link>
      </h2>
      {meta.length > 0 && (
        <dl className="mt-3 flex flex-col gap-1.5 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:gap-x-5">
          {meta.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex min-w-0 items-center gap-1.5">
              <dt className="sr-only">{label}</dt>
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
              <dd className="min-w-0 break-words">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {excerpt && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{excerpt}</p>}
      <div className="mt-auto pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          {posted ? (
            <p className="flex items-center gap-1.5 text-sm text-slate-500">
              <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0" />
              Posted <time dateTime={vacancy.postedAt ?? undefined}>{posted}</time>
            </p>
          ) : (
            <span />
          )}
          <span aria-hidden="true" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700">
            View role
            <ArrowRight className={cn("h-4 w-4", storeArrowNudge)} />
          </span>
        </div>
      </div>
    </article>
  );
}
