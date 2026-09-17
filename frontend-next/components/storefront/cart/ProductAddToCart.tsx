"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui";
import { MAX_QUANTITY } from "@/lib/cart/store";
import { cn } from "@/lib/cn";
import { PRODUCT_PAGE_MAX_QUANTITY, canBuyOnline, type CartProduct } from "@/lib/storefront/cartProduct";
import { storeRoutes } from "@/lib/storefront/routes";
import { storeLink } from "@/lib/storefront/styles";
import { useHydrated } from "@/lib/useHydrated";
import QuantityStepper from "./QuantityStepper";
import { useAddProductToCart } from "./useAddProductToCart";

export type ProductAddToCartProps = {
  product: CartProduct;
  className?: string;
};

/**
 * Product page purchase controls: a quantity stepper (1 to 10, since public stock counts are hidden) and Add to cart.
 * Out of stock (or unpriced) products show a disabled button instead. Adding to a product already in the cart adds to
 * its quantity, up to the cart maximum of 100.
 */
export default function ProductAddToCart({ product, className }: ProductAddToCartProps) {
  const hydrated = useHydrated();
  const [quantity, setQuantity] = useState(1);
  const { add, inCart, announcement } = useAddProductToCart(product);
  const buyable = canBuyOnline(product);
  const room = Math.max(0, MAX_QUANTITY - inCart);
  const max = Math.max(1, Math.min(PRODUCT_PAGE_MAX_QUANTITY, room));
  const value = Math.min(quantity, max);
  const cartFull = room === 0;
  // Presentation only: after a successful add the button briefly reads "Added" and a ring pulses once (§8.2).
  const [added, setAdded] = useState(0);
  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(0), 1600);
    return () => clearTimeout(timer);
  }, [added]);

  if (!buyable) {
    return (
      <div className={className}>
        <Button size="lg" className="w-full" disabled aria-describedby="product-unavailable-note" icon={<ShoppingCart aria-hidden="true" />}>
          {product.inStock ? "Unavailable" : "Out of stock"}
        </Button>
        <p id="product-unavailable-note" className="mt-2 text-sm text-slate-500">
          {product.inStock
            ? "This product can’t be ordered online right now. Ask us and we’ll check the price for you."
            : "This product is out of stock. Ask us when it will be back, or for a matching alternative."}
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center md:flex-col md:items-stretch xl:flex-row xl:items-center">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="text-sm font-medium text-slate-700">
            Quantity
          </span>
          <QuantityStepper
            label={`Quantity for ${product.name}`}
            value={value}
            min={1}
            max={max}
            onChange={setQuantity}
            disabled={!hydrated || cartFull}
            maxHintId="product-quantity-max"
          />
        </div>
        <div className="relative w-full sm:flex-1 md:flex-none xl:flex-1">
          <Button
            size="lg"
            className="w-full"
            disabled={!hydrated || cartFull}
            aria-busy={!hydrated || undefined}
            icon={added ? <CheckCircle2 aria-hidden="true" /> : <ShoppingCart aria-hidden="true" />}
            onClick={() => {
              if (add(value)) {
                setQuantity(1);
                setAdded((count) => count + 1);
              }
            }}
          >
            {added ? "Added" : "Add to cart"}
          </Button>
          {added > 0 && <span key={added} aria-hidden="true" className="je-added pointer-events-none absolute inset-0 rounded-lg ring-2 ring-brand-500" />}
        </div>
      </div>

      <div className="mt-2 space-y-1 text-sm text-slate-500">
        {hydrated && value >= max && !cartFull && (
          <p id="product-quantity-max">
            {max < PRODUCT_PAGE_MAX_QUANTITY
              ? `You can add ${max} more (up to ${MAX_QUANTITY} per order).`
              : `Up to ${PRODUCT_PAGE_MAX_QUANTITY} at a time. Need more? Change the quantity in your cart or ask us.`}
          </p>
        )}
        {hydrated && inCart > 0 && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-green-600" />
            <span>
              {inCart} in your cart{cartFull ? ` (the most per order)` : ""}.
            </span>
            <Link href={storeRoutes.cart} className={cn(storeLink, "inline-flex min-h-11 items-center md:min-h-0")}>
              View cart
            </Link>
          </p>
        )}
      </div>

      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </div>
  );
}
