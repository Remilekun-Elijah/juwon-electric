import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { storeCard, storeContainer, storeSection } from "@/lib/storefront/styles";

const pulse = "motion-reduce:animate-none";

/** Dark PageIntro-shaped placeholder (TEAM_AND_MOTION_V1 §8.1); `data-store-hero` keeps the header transparent over it. */
export function IntroSkeleton({ breadcrumbs = false, actions = false }: { breadcrumbs?: boolean; actions?: boolean }) {
  const bar = cn(pulse, "bg-white/10");
  return (
    <div data-store-hero="" className="-mt-[65px] bg-brand-950 md:-mt-[73px]">
      <div className={cn(storeContainer, "pb-12 pt-28 sm:pb-16 sm:pt-32")}>
        {breadcrumbs && <Skeleton className={cn(bar, "mb-6 h-4 w-48")} />}
        <Skeleton className={cn(bar, "h-3 w-24")} />
        <Skeleton className={cn(bar, "mt-4 h-9 w-full max-w-md sm:h-11")} />
        <Skeleton className={cn(bar, "mt-4 h-4 w-full max-w-2xl")} />
        <Skeleton className={cn(bar, "mt-2 h-4 w-3/4 max-w-xl")} />
        {actions && <Skeleton className={cn(bar, "mt-6 h-11 w-40")} />}
      </div>
    </div>
  );
}

/** Grid of card placeholders with an image block and text lines. */
export function CardGridSkeleton({
  count = 6,
  image = true,
  columns = "sm:grid-cols-2 lg:grid-cols-3",
}: {
  count?: number;
  image?: boolean;
  columns?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-5", columns)}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={cn(storeCard, "overflow-hidden")}>
          {image && <Skeleton className={cn(pulse, "aspect-[4/3] w-full rounded-none")} />}
          <div className="space-y-3 p-5">
            <Skeleton className={cn(pulse, "h-5 w-2/3")} />
            <Skeleton className={cn(pulse, "h-4 w-full")} />
            <Skeleton className={cn(pulse, "h-4 w-1/2")} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Loading shell for a content page: intro plus a card grid. Announces loading to screen readers. */
export default function ContentSkeleton({
  label,
  breadcrumbs,
  children,
}: {
  label: string;
  breadcrumbs?: boolean;
  children?: ReactNode;
}) {
  return (
    <div aria-busy="true">
      <p role="status" className="sr-only">
        {label}
      </p>
      <IntroSkeleton breadcrumbs={breadcrumbs} />
      <div className={storeSection}>
        <div className={storeContainer}>{children ?? <CardGridSkeleton />}</div>
      </div>
    </div>
  );
}
