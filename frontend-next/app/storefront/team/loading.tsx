import { IntroSkeleton } from "@/components/storefront/content/ContentSkeleton";
import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { storeContainer, storeSection } from "@/lib/storefront/styles";

const pulse = "motion-reduce:animate-none";

export default function Loading() {
  return (
    <div aria-busy="true">
      <p role="status" className="sr-only">
        Loading the team
      </p>
      <IntroSkeleton />
      <div className={storeSection}>
        <div className={storeContainer}>
          <Skeleton className={cn(pulse, "mb-8 h-8 w-48 sm:mb-10")} />
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index}>
                <Skeleton className={cn(pulse, "aspect-square w-full rounded-2xl")} />
                <Skeleton className={cn(pulse, "mt-4 h-4 w-3/4")} />
                <Skeleton className={cn(pulse, "mt-2 h-3.5 w-1/2")} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
