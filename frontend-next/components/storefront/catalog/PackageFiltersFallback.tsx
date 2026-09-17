import type { Package } from "@/lib/api/types";
import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { storeCard } from "@/lib/storefront/styles";
import PackageGrid from "./PackageGrid";

/**
 * Server-rendered stand-in for PackageFilters while it hydrates (and for visitors without JavaScript): a filter bar
 * placeholder and every package, unfiltered.
 */
export default function PackageFiltersFallback({ packages }: { packages: Package[] }) {
  return (
    <div>
      <div className={cn(storeCard, "p-4 sm:p-5")}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Skeleton className="h-4 w-24" />
            <div className="mt-2 flex flex-wrap gap-2">
              {[0, 1, 2, 3].map((index) => (
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
      <PackageGrid packages={packages} className="mt-4" />
    </div>
  );
}
