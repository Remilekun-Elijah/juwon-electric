import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { storeCard, storeCardPadding, storeContainer } from "@/lib/storefront/styles";

/**
 * Placeholder for the cart and checkout while the stored cart loads (it is empty on the server and during hydration)
 * and for their `loading.tsx`. `variant="checkout"` swaps the item list for form fields. Server component.
 */
export default function CartSkeleton({ variant = "cart", label = "Loading your cart" }: { variant?: "cart" | "checkout"; label?: string }) {
  return (
    <div className={cn(storeContainer, "py-8 sm:py-12")} aria-busy="true">
      <p className="sr-only" role="status">
        {label}
      </p>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className={cn(storeCard, storeCardPadding, "space-y-5")}>
          <Skeleton className="h-5 w-40" />
          {variant === "cart"
            ? [0, 1].map((row) => (
                <div key={row} className="flex gap-4 border-t border-slate-100 pt-5">
                  <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <Skeleton className="h-11 w-36" />
                      <Skeleton className="h-6 w-28" />
                    </div>
                  </div>
                </div>
              ))
            : [0, 1, 2, 3].map((row) => (
                <div key={row} className="space-y-2">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className={cn("w-full", row === 3 ? "h-24" : "h-11")} />
                </div>
              ))}
        </div>
        <div className={cn(storeCard, storeCardPadding, "space-y-4")}>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    </div>
  );
}
