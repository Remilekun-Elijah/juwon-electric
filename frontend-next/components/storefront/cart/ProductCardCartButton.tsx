"use client";

import Link from "next/link";
import { CheckCircle2, ShoppingCart } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui";
import { cn } from "@/lib/cn";
import { canBuyOnline, type CartProduct } from "@/lib/storefront/cartProduct";
import { storeRoutes } from "@/lib/storefront/routes";
import { useHydrated } from "@/lib/useHydrated";
import { useAddProductToCart } from "./useAddProductToCart";

export type ProductCardCartButtonProps = {
  product: CartProduct;
  className?: string;
};

/**
 * Compact Add to cart for product cards. Renders nothing unless the product is in stock and priced. Once the product
 * is in the cart it becomes an "In cart" link to /cart (change the quantity there). It sits above the card's
 * full-card link overlay (`relative z-10`).
 */
export default function ProductCardCartButton({ product, className }: ProductCardCartButtonProps) {
  const hydrated = useHydrated();
  const { add, inCart, announcement } = useAddProductToCart(product);

  if (!canBuyOnline(product)) return null;

  const live = (
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {announcement}
    </span>
  );

  if (hydrated && inCart > 0) {
    return (
      <>
        <Link
          href={storeRoutes.cart}
          aria-label={`In cart: ${product.name}. View cart`}
          className={buttonClasses({ variant: "outline", size: "sm", className: cn("relative z-10 w-full gap-1.5 max-sm:h-11", className) })}
        >
          <CheckCircle2 aria-hidden="true" className="text-green-600" />
          In cart
        </Link>
        {live}
      </>
    );
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className={cn("relative z-10 w-full max-sm:h-11", className)}
        disabled={!hydrated}
        aria-busy={!hydrated || undefined}
        aria-label={`Add to cart: ${product.name}`}
        icon={<ShoppingCart aria-hidden="true" />}
        onClick={() => add(1)}
      >
        Add to cart
      </Button>
      {live}
    </>
  );
}
