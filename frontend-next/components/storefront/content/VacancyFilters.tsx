import { useId } from "react";
import Link from "next/link";
import { Filter, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { storeRoutes } from "@/lib/storefront/routes";
import { storeCard, storeFocus } from "@/lib/storefront/styles";

export type VacancyFilterState = { department: string; type: string };

export type VacancyFilterOption = { value: string; label: string; count: number };

/** `/vacancies?department=…&type=…` with empty values left out. */
export const vacanciesHref = ({ department, type }: VacancyFilterState) => {
  const params = new URLSearchParams();
  if (department) params.set("department", department);
  if (type) params.set("type", type);
  const query = params.toString();
  return query ? `${storeRoutes.vacancies}?${query}` : storeRoutes.vacancies;
};

const chip = (active: boolean) =>
  cn(
    "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors md:min-h-9",
    storeFocus,
    active
      ? "border-brand-200 bg-brand-50 text-brand-700"
      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
  );

function FilterGroup({
  label,
  options,
  selected,
  hrefFor,
}: {
  label: string;
  options: VacancyFilterOption[];
  selected: string;
  hrefFor: (value: string) => string;
}) {
  const labelId = useId();
  return (
    <div className="min-w-0">
      <p id={labelId} className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <ul aria-labelledby={labelId} className="mt-3 flex flex-wrap gap-2">
        <li>
          <Link href={hrefFor("")} aria-current={!selected ? "page" : undefined} className={chip(!selected)}>
            All
          </Link>
        </li>
        {options.map((option) => {
          const active = option.value === selected;
          return (
            <li key={option.value} className="min-w-0">
              <Link href={hrefFor(option.value)} aria-current={active ? "page" : undefined} className={chip(active)}>
                <span className="truncate">{option.label}</span>
                <span className={cn("tabular-nums", active ? "text-brand-700/80" : "text-slate-400")}>{option.count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export type VacancyFiltersProps = {
  departments: VacancyFilterOption[];
  types: VacancyFilterOption[];
  selected: VacancyFilterState;
};

/**
 * Department and employment type filters as plain query links, so they work without JavaScript and every filtered
 * view has its own URL. Server component.
 */
export default function VacancyFilters({ departments, types, selected }: VacancyFiltersProps) {
  const filtered = Boolean(selected.department || selected.type);
  if (departments.length === 0 && types.length === 0) return null;

  return (
    <nav aria-label="Filter roles" className={cn(storeCard, "p-5 sm:p-6")}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Filter aria-hidden="true" className="h-4 w-4 text-brand-700" />
          Filter roles
        </p>
        {filtered && (
          <Link href={storeRoutes.vacancies} className={cn("inline-flex min-h-11 items-center gap-1 rounded-sm text-sm font-medium text-brand-700 hover:text-brand-800 md:min-h-0", storeFocus)}>
            <X aria-hidden="true" className="h-4 w-4" />
            Clear filters
          </Link>
        )}
      </div>
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        {departments.length > 0 && (
          <FilterGroup
            label="Department"
            options={departments}
            selected={selected.department}
            hrefFor={(department) => vacanciesHref({ ...selected, department })}
          />
        )}
        {types.length > 0 && (
          <FilterGroup
            label="Employment type"
            options={types}
            selected={selected.type}
            hrefFor={(type) => vacanciesHref({ ...selected, type })}
          />
        )}
      </div>
    </nav>
  );
}
