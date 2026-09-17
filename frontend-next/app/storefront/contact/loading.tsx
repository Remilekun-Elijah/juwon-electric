import ContentSkeleton from "@/components/storefront/content/ContentSkeleton";
import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <ContentSkeleton label="Loading the contact page">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Skeleton className="h-[520px] w-full rounded-2xl motion-reduce:animate-none" />
        <Skeleton className="h-80 w-full rounded-2xl motion-reduce:animate-none" />
      </div>
    </ContentSkeleton>
  );
}
