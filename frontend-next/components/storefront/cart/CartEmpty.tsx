import Link from "next/link";
import { Package, ShoppingCart } from "lucide-react";
import { buttonClasses } from "@/components/ui";
import { cn } from "@/lib/cn";
import { storeRoutes } from "@/lib/storefront/routes";
import { storeCard, storeContainer } from "@/lib/storefront/styles";

export type CartEmptyProps = {
  title?: string;
  description?: string;
  /** Show "Back to cart" instead of the shopping links (used on /checkout). */
  backToCart?: boolean;
};

/** Empty cart card with links to shop. Uses an h2 so the page heading order stays h1 → h2. Server-safe. */
export default function CartEmpty({
  title = "Your cart is empty",
  description = "Choose an inverter package to keep your lights on through NEPA outages, or add batteries, panels and parts from our products.",
  backToCart = false,
}: CartEmptyProps) {
  return (
    <div className={cn(storeContainer, "py-8 sm:py-12")}>
      <div role="status" className={cn(storeCard, "je-in je-in-fast mx-auto flex max-w-2xl flex-col items-center px-6 py-12 text-center sm:py-16")}>
        {/* The illustration floats gently (none under reduced motion). */}
        <span className="je-float grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-700">
          <ShoppingCart aria-hidden="true" className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600 sm:text-base">{description}</p>
        <div className="mt-6 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          {backToCart ? (
            <Link href={storeRoutes.cart} className={buttonClasses({ size: "lg" })}>
              <ShoppingCart aria-hidden="true" />
              Back to cart
            </Link>
          ) : null}
          <Link href={storeRoutes.packages} className={buttonClasses({ variant: backToCart ? "outline" : "primary", size: "lg" })}>
            <Package aria-hidden="true" />
            Shop packages
          </Link>
          <Link href={storeRoutes.products} className={buttonClasses({ variant: "outline", size: "lg" })}>
            Browse products
          </Link>
        </div>
      </div>
    </div>
  );
}
