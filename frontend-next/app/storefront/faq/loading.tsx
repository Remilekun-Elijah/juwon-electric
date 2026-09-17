import ContentSkeleton from "@/components/storefront/content/ContentSkeleton";
import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <ContentSkeleton label="Loading frequently asked questions">
      <div className="mx-auto max-w-3xl space-y-3">
        <Skeleton className="h-7 w-40 motion-reduce:animate-none" />
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-xl motion-reduce:animate-none" />
        ))}
      </div>
    </ContentSkeleton>
  );
}
