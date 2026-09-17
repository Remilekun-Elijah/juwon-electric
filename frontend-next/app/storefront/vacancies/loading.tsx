import ContentSkeleton, { CardGridSkeleton } from "@/components/storefront/content/ContentSkeleton";
import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <ContentSkeleton label="Loading open roles">
      <Skeleton className="h-32 w-full rounded-2xl motion-reduce:animate-none" />
      <div className="mt-6">
        <CardGridSkeleton count={4} image={false} columns="md:grid-cols-2" />
      </div>
    </ContentSkeleton>
  );
}
