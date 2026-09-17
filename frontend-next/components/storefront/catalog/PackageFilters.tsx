"use client";

import { useState, useTransition, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, Phone } from "lucide-react";
import { EmptyState, Select, buttonClasses } from "@/components/ui";
import type { Package } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { storeRoutes } from "@/lib/storefront/routes";
import { storeCard, storeFocus } from "@/lib/storefront/styles";
import PackageGrid from "./PackageGrid";
import {
  KVA_FILTERS,
  PACKAGE_SORTS,
  PACKAGE_TYPE_FILTERS,
  filterPackages,
  packageTypeKey,
  parseKvaFilter,
  parseSort,
  parseTypeFilter,
  type PackageFilterState,
} from "./packageMeta";

const DEFAULTS: PackageFilterState = { type: "all", kva: "all", sort: "recommended" };

/** Filter change: the new cards fade in with an 8px rise over 300ms. */
const CROSS_FADE = { "--in-duration": "300ms", "--in-y": "8px" } as CSSProperties;

/**
 * Package filters (type, kVA range, price sort) over the server-fetched packages. The state lives in the URL query
 * (`?type=lithium&kva=2-5&sort=price-asc`) so a filtered view can be shared. Wrap in <Suspense> (useSearchParams).
 */
export default function PackageFilters({ packages }: { packages: Package[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const state: PackageFilterState = {
    type: parseTypeFilter(searchParams.get("type")),
    kva: parseKvaFilter(searchParams.get("kva")),
    sort: parseSort(searchParams.get("sort")),
  };
  const { type, kva, sort } = state;

  const visible = filterPackages(packages, state);
  const counts = new Map<string, number>();
  for (const pkg of packages) counts.set(packageTypeKey(pkg), (counts.get(packageTypeKey(pkg)) ?? 0) + 1);

  const update = (next: Partial<PackageFilterState>) => {
    const merged = { ...state, ...next };
    const params = new URLSearchParams(searchParams.toString());
    for (const key of Object.keys(DEFAULTS) as (keyof PackageFilterState)[]) {
      if (merged[key] === DEFAULTS[key]) params.delete(key);
      else params.set(key, merged[key]);
    }
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${storeRoutes.packages}?${query}` : storeRoutes.packages, { scroll: false });
    });
  };

  const filtered = type !== "all" || kva !== "all";
  // The grid cross-fades when the filters change, but not when this island replaces the server fallback on load (the
  // fallback already played the entrance).
  const filterKey = `${type}|${kva}|${sort}`;
  const [initialKey] = useState(filterKey);
  const changed = filterKey !== initialKey;

  return (
    <div>
      <div className={cn(storeCard, "p-4 sm:p-5")}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <fieldset>
            <legend className="text-sm font-medium text-slate-700">Battery type</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {PACKAGE_TYPE_FILTERS.map((item) => {
                const selected = item.value === type;
                const count = item.value === "all" ? packages.length : (counts.get(item.value) ?? 0);
                return (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => update({ type: item.value })}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition-colors md:min-h-10",
                      storeFocus,
                      selected
                        ? "border-brand-200 bg-brand-50 text-brand-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    {item.label}
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-xs tabular-nums",
                        selected ? "bg-white text-brand-700" : "bg-slate-100 text-slate-500"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2 lg:w-[28rem]">
            <div>
              <label htmlFor="package-kva" className="text-sm font-medium text-slate-700">
                Size
              </label>
              <Select
                id="package-kva"
                size="lg"
                className="mt-2"
                value={kva}
                onChange={(event) => update({ kva: parseKvaFilter(event.target.value) })}
                options={KVA_FILTERS.map((item) => ({ value: item.value, label: item.label }))}
              />
            </div>
            <div>
              <label htmlFor="package-sort" className="text-sm font-medium text-slate-700">
                Sort by
              </label>
              <Select
                id="package-sort"
                size="lg"
                className="mt-2"
                value={sort}
                onChange={(event) => update({ sort: parseSort(event.target.value) })}
                options={PACKAGE_SORTS.map((item) => ({ value: item.value, label: item.label }))}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500" aria-live="polite">
          {visible.length === packages.length
            ? `Showing all ${packages.length} ${packages.length === 1 ? "package" : "packages"}`
            : `Showing ${visible.length} of ${packages.length} packages`}
        </p>
        {filtered && (
          <button
            type="button"
            onClick={() => update({ type: "all", kva: "all" })}
            className={cn("min-h-11 rounded-sm text-sm font-medium text-brand-700 hover:text-brand-800 md:min-h-0", storeFocus)}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className={cn("mt-4 transition-opacity", pending && "opacity-60")} aria-busy={pending || undefined}>
        <div key={filterKey} className={changed ? "je-in" : undefined} style={changed ? CROSS_FADE : undefined}>
          {visible.length ? (
            <PackageGrid packages={visible} />
          ) : (
            <EmptyState
              standalone
              icon={Filter}
              title="No packages match these filters"
              description="Try another size or battery type, or tell us what you need to power and we’ll size a system for you."
              action={
                <>
                  <button type="button" onClick={() => update({ type: "all", kva: "all" })} className={buttonClasses({ variant: "outline", size: "lg" })}>
                    Clear filters
                  </button>
                  <Link href={storeRoutes.contact} className={buttonClasses({ size: "lg" })}>
                    <Phone aria-hidden="true" />
                    Talk to an engineer
                  </Link>
                </>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
