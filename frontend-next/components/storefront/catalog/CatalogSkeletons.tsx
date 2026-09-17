import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { storeCard, storeCardPadding, storeContainer } from "@/lib/storefront/styles";

/** Loading stand-ins for the catalogue routes (loading.tsx). Server components; screen readers get one status line. */

/** Dark PageIntro-shaped placeholder (TEAM_AND_MOTION_V1 §8.1); `data-store-hero` keeps the header transparent over it. */
export function IntroSkeleton({ breadcrumbs = false, children }: { breadcrumbs?: boolean; children?: ReactNode }) {
  return (
    <div data-store-hero="" className="-mt-16 bg-slate-950 md:-mt-[72px]">
      <div className={cn(storeContainer, "pb-12 pt-28 sm:pb-16 sm:pt-32")}>
        <p role="status" className="sr-only">
          Loading…
        </p>
        {breadcrumbs && <Skeleton className="mb-6 h-4 w-56 bg-white/10" />}
        <Skeleton className="h-3 w-24 bg-white/10" />
        <Skeleton className="mt-4 h-9 w-full max-w-md bg-white/10 sm:h-11" />
        <Skeleton className="mt-4 h-5 w-full max-w-2xl bg-white/10" />
        <Skeleton className="mt-2 h-5 w-2/3 max-w-xl bg-white/10" />
        {children}
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6, className, image = false }: { count?: number; className?: string; image?: boolean }) {
  return (
    <div className={cn("grid gap-4 sm:gap-6", className)}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={cn(storeCard, "overflow-hidden")}>
          {image && <Skeleton className="aspect-square w-full rounded-none" />}
          <div className={storeCardPadding}>
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="mt-4 h-5 w-3/4" />
            <Skeleton className="mt-2 h-4 w-1/2" />
            <Skeleton className="mt-5 h-6 w-28" />
            {!image && <Skeleton className="mt-4 h-11 w-full rounded-lg" />}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProductListingSkeleton() {
  return (
    <div className={cn(storeContainer, "py-10 sm:py-14")}>
      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-8">
        <div className={cn(storeCard, "p-3")}>
          <Skeleton className="h-6 w-40 lg:hidden" />
          <div className="hidden space-y-2 lg:block">
            {Array.from({ length: 7 }, (_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="h-[4.5rem] w-full rounded-2xl" />
          <Skeleton className="mt-5 h-4 w-48" />
          <CardGridSkeleton count={6} image className="mt-4 sm:grid-cols-2 xl:grid-cols-3" />
        </div>
      </div>
    </div>
  );
}

export function DetailSkeleton({ gallery = false }: { gallery?: boolean }) {
  return (
    <div className={cn(storeContainer, "py-10 sm:py-14")}>
      <div className={cn("grid gap-6 lg:gap-8", gallery ? "md:grid-cols-2" : "lg:grid-cols-3")}>
        {gallery ? (
          <Skeleton className="aspect-square w-full rounded-2xl" />
        ) : (
          <div className={cn(storeCard, storeCardPadding, "lg:order-last")}>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-3 h-8 w-40" />
            <Skeleton className="mt-6 h-16 w-full rounded-xl" />
            <Skeleton className="mt-3 h-16 w-full rounded-xl" />
            <Skeleton className="mt-5 h-11 w-full rounded-lg" />
          </div>
        )}
        <div className={cn("space-y-6", !gallery && "lg:col-span-2")}>
          {[0, 1, 2].map((index) => (
            <div key={index} className={cn(storeCard, storeCardPadding)}>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-4 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-5/6" />
              <Skeleton className="mt-2 h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
