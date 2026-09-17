import { Skeleton } from "@/components/ui";
import PageIntro from "@/components/storefront/PageIntro";
import { cn } from "@/lib/cn";
import { storeContainer } from "@/lib/storefront/styles";

export default function Loading() {
  return (
    <>
      <PageIntro eyebrow="Checkout" title="Order confirmation" />
      <div className={cn(storeContainer, "py-8 sm:py-12")} aria-busy="true">
        <p className="sr-only" role="status">
          Loading your order
        </p>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Skeleton className="h-80 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
      </div>
    </>
  );
}
