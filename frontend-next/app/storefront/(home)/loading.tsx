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
      <div className={cn(storeContainer, "pt-4 sm:pt-6 lg:pt-8")}>
        <div className="grid gap-10 rounded-2xl bg-brand-800 px-5 py-10 sm:px-10 sm:py-14 lg:grid-cols-2 lg:px-14 lg:py-16">
          <div className="space-y-4">
            <Skeleton className="h-3 w-48 bg-white/15 motion-reduce:animate-none" />
            <Skeleton className="h-10 w-full max-w-md bg-white/15 motion-reduce:animate-none sm:h-14" />
            <Skeleton className="h-4 w-full max-w-lg bg-white/15 motion-reduce:animate-none" />
            <Skeleton className="h-11 w-44 bg-white/15 motion-reduce:animate-none" />
          </div>
          <Skeleton className="aspect-[4/3] w-full rounded-xl bg-white/15 motion-reduce:animate-none" />
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
