import { CardGridSkeleton, IntroSkeleton } from "@/components/storefront/catalog/CatalogSkeletons";
import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { storeContainer } from "@/lib/storefront/styles";

export default function Loading() {
  return (
    <>
      <IntroSkeleton />
      <div className={cn(storeContainer, "py-10 sm:py-14")}>
        <Skeleton className="h-32 w-full rounded-2xl lg:h-24" />
        <Skeleton className="mt-6 h-4 w-40" />
        <CardGridSkeleton count={6} className="mt-4 md:grid-cols-2 lg:grid-cols-3" />
      </div>
    </>
  );
}
