import type { Package } from "@/lib/api/types";
import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { enterDelay, storeCard } from "@/lib/storefront/styles";
import PackageGrid from "./PackageGrid";
import { categorisedPackages, packageCategoryOptions } from "./packageMeta";

/**
 * Server-rendered stand-in for PackageFilters while it hydrates (and for visitors without JavaScript): a filter bar
 * placeholder and every package, unfiltered. It is what the page first paints, so it carries the page-load entrance:
 * the filter bar fades in and the cards rise in a stagger. The category chips are placeholders for the same options
 * PackageFilters will render ("All" plus one per category on the page), so the bar doesn't resize on hydration.
 */
export default function PackageFiltersFallback({ packages }: { packages: Package[] }) {
  const chips = packageCategoryOptions(categorisedPackages(packages)).length + 1;
  return (
    <div>
      <div style={enterDelay(300)} className={cn(storeCard, "je-in je-in-fade p-4 sm:p-5")}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Skeleton className="h-4 w-24" />
            <div className="mt-2 flex flex-wrap gap-2">
              {Array.from({ length: chips }, (_, index) => index).map((index) => (
                <Skeleton key={index} className="h-11 w-24 rounded-lg md:h-10" />
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:w-[28rem]">
            <Skeleton className="h-[4.25rem] rounded-lg" />
            <Skeleton className="h-[4.25rem] rounded-lg" />
          </div>
        </div>
      </div>
      <p className="mt-6 text-sm text-slate-500">
        Showing all {packages.length} {packages.length === 1 ? "package" : "packages"}
      </p>
      <PackageGrid packages={packages} enter enterDelay={380} className="mt-4" />
    </div>
  );
}
