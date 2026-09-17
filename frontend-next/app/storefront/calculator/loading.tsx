import ContentSkeleton from "@/components/storefront/content/ContentSkeleton";
import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <ContentSkeleton label="Loading the load calculator">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Skeleton className="h-[640px] w-full rounded-2xl motion-reduce:animate-none" />
        <div className="space-y-6">
          <Skeleton className="h-80 w-full rounded-2xl motion-reduce:animate-none" />
          <Skeleton className="h-48 w-full rounded-2xl motion-reduce:animate-none" />
        </div>
      </div>
    </ContentSkeleton>
  );
}
