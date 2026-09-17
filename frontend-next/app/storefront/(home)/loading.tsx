import { CardGridSkeleton } from "@/components/storefront/content/ContentSkeleton";
import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { storeContainer, storeSection } from "@/lib/storefront/styles";

export default function Loading() {
  return (
    <div aria-busy="true">
      <p role="status" className="sr-only">
        Loading the home page
      </p>
      {/* Full-bleed dark hero placeholder under the transparent header, the same height as HomeHero. */}
      <div data-store-hero="" className="-mt-[65px] flex min-h-[max(640px,min(100svh,920px))] flex-col bg-slate-950 md:-mt-[73px]">
        <div className={cn(storeContainer, "flex flex-1 flex-col justify-center pb-24 pt-28 sm:pb-28 md:pt-36")}>
          <div className="max-w-3xl space-y-5">
            <Skeleton className="h-8 w-72 max-w-full rounded-full bg-white/10 motion-reduce:animate-none" />
            <Skeleton className="h-12 w-full max-w-xl bg-white/10 motion-reduce:animate-none sm:h-16" />
            <Skeleton className="h-12 w-3/4 max-w-lg bg-white/10 motion-reduce:animate-none sm:h-16" />
            <Skeleton className="h-5 w-full max-w-2xl bg-white/10 motion-reduce:animate-none" />
            <div className="flex flex-col gap-3 pt-3 sm:flex-row">
              <Skeleton className="h-14 w-full rounded-full bg-white/10 motion-reduce:animate-none sm:w-48" />
              <Skeleton className="h-14 w-full rounded-full bg-white/10 motion-reduce:animate-none sm:w-56" />
            </div>
          </div>
        </div>
      </div>
      <div className={storeSection}>
        <div className={storeContainer}>
          <Skeleton className="h-3 w-24 motion-reduce:animate-none" />
          <Skeleton className="mt-3 h-8 w-64 motion-reduce:animate-none" />
          <Skeleton className="mt-8 h-10 w-80 max-w-full motion-reduce:animate-none" />
          <div className="mt-6">
            <CardGridSkeleton count={3} image={false} />
          </div>
        </div>
      </div>
    </div>
  );
}
