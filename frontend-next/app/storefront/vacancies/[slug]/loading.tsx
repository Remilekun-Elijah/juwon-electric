import ContentSkeleton from "@/components/storefront/content/ContentSkeleton";
import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { storeCard } from "@/lib/storefront/styles";

export default function Loading() {
  return (
    <ContentSkeleton label="Loading this role" breadcrumbs>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className={cn(storeCard, "space-y-3 p-5 sm:p-8")}>
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className={cn("h-4 motion-reduce:animate-none", index % 3 === 2 ? "w-2/3" : "w-full")} />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-2xl motion-reduce:animate-none" />
      </div>
    </ContentSkeleton>
  );
}
