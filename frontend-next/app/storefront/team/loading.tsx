import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { storeContainer, storeSection } from "@/lib/storefront/styles";

const pulse = "motion-reduce:animate-none";

/** Mirrors the team page: two-column intro with a portrait, the team jump links, and one group section (row cards on phones, a 2/3/4 grid from `sm`). */
export default function Loading() {
  const bar = cn(pulse, "bg-white/10");
  return (
    <div aria-busy="true">
      <p role="status" className="sr-only">
        Loading the team
      </p>
      <div data-store-hero="" className="-mt-[65px] bg-brand-950 md:-mt-[73px]">
        <div className={cn(storeContainer, "grid gap-10 pb-12 pt-28 sm:pb-16 sm:pt-32 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-16")}>
          <div>
            <Skeleton className={cn(bar, "h-3 w-24")} />
            <Skeleton className={cn(bar, "mt-4 h-9 w-full max-w-md sm:h-11")} />
            <Skeleton className={cn(bar, "mt-4 h-4 w-full max-w-2xl")} />
            <Skeleton className={cn(bar, "mt-2 h-4 w-3/4 max-w-xl")} />
            <Skeleton className={cn(bar, "mt-6 h-4 w-full max-w-2xl")} />
            <Skeleton className={cn(bar, "mt-2 h-4 w-5/6 max-w-2xl")} />
            <Skeleton className={cn(bar, "mt-2 h-4 w-2/3 max-w-xl")} />
            <div className="mt-8 grid grid-cols-3 gap-3 border-t border-white/10 pt-6 sm:flex sm:gap-10">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className={cn(bar, "h-12 w-full rounded-full sm:w-40")} />
              ))}
            </div>
          </div>
          <Skeleton className={cn(bar, "mx-auto aspect-[16/10] w-full max-w-md rounded-3xl sm:aspect-[4/3] lg:max-w-none")} />
        </div>
      </div>

      <div className="flex gap-2 overflow-hidden border-b border-slate-200 bg-white px-4 py-3 sm:justify-center">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className={cn(pulse, "h-10 w-36 shrink-0 rounded-full")} />
        ))}
      </div>

      <div className={cn(storeSection, "border-y border-slate-200 bg-white")}>
        <div className={storeContainer}>
          <div className="mb-8 flex flex-col items-center sm:mb-10">
            <Skeleton className={cn(pulse, "h-3 w-20")} />
            <Skeleton className={cn(pulse, "mt-3 h-8 w-64 max-w-full sm:h-9")} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="grid grid-cols-[6.5rem_minmax(0,1fr)] overflow-hidden rounded-2xl border border-slate-200 bg-white sm:block">
                <Skeleton className={cn(pulse, "min-h-36 w-full rounded-none sm:aspect-4/5 sm:min-h-0")} />
                <div className="p-4 sm:p-5">
                  <Skeleton className={cn(pulse, "h-4 w-3/4")} />
                  <Skeleton className={cn(pulse, "mt-2 h-3.5 w-1/2")} />
                  <Skeleton className={cn(pulse, "mt-4 h-3 w-full")} />
                  <Skeleton className={cn(pulse, "mt-1.5 h-3 w-5/6")} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
