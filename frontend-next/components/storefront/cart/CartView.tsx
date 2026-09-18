"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight, Package, ShieldCheck, Truck } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui";
import { cartLineCount, useProductCart } from "@/lib/cart/productStore";
import { useCart } from "@/lib/cart/store";
import { useCartQuote } from "@/lib/cart/useCartQuote";
import { cn } from "@/lib/cn";
import { storeRoutes } from "@/lib/storefront/routes";
import { enterDelay, storeCard, storeCardPadding, storeContainer, storeLink } from "@/lib/storefront/styles";
import { useHydrated } from "@/lib/useHydrated";
import CartEmpty from "./CartEmpty";
import CartLines from "./CartLines";
import CartSkeleton from "./CartSkeleton";
import OrderSummary from "./OrderSummary";
import ProductCartLines from "./ProductCartLines";

/**
 * `/cart` client island: stored package and product lines with one server quote (packages first, then products) and
 * the order summary. The cart is empty on the server and during hydration, so a skeleton shows until the stored cart is
 * read. The empty state only shows when both kinds of line are empty.
 */
export default function CartView({ productsEnabled = true }: { productsEnabled?: boolean }) {
  const hydrated = useHydrated();
  const cart = useCart();
  const products = useProductCart();
  const quote = useCartQuote({ open: hydrated, cart, products });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const count = cartLineCount(cart.length, products.length);

  if (!hydrated) return <CartSkeleton />;
  if (!count) return <CartEmpty productsEnabled={productsEnabled} />;

  const blockedReason =
    quote.status === "loading"
      ? "Checking current prices…"
      : quote.unavailableKeys.length
        ? "Remove unavailable items to check out."
        : "";

  const action = quote.blocked ? (
    <>
      <Button size="lg" className="w-full" disabled loading={quote.status === "loading"} aria-describedby="checkout-blocked">
        Proceed to checkout
      </Button>
      <p id="checkout-blocked" className="mt-2 text-center text-xs text-slate-500">
        {blockedReason}
      </p>
    </>
  ) : (
    <Link href={storeRoutes.checkout} className={buttonClasses({ size: "lg", className: "w-full" })}>
      Proceed to checkout
      <ArrowRight aria-hidden="true" />
    </Link>
  );

  return (
    <div className={cn(storeContainer, "py-8 sm:py-12")}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <section aria-labelledby="cart-items-heading" className={cn(storeCard, storeCardPadding, "je-in je-in-fast")}>
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <h2 id="cart-items-heading" ref={headingRef} tabIndex={-1} className="text-base font-semibold text-slate-900 focus:outline-hidden">
              Your cart <span className="font-normal text-slate-500">({count})</span>
            </h2>
            <div className="flex flex-wrap justify-end gap-x-4">
              <Link href={storeRoutes.packages} className={cn(storeLink, "inline-flex min-h-11 items-center text-sm")}>
                Add a package
              </Link>
              {productsEnabled && (
                <Link href={storeRoutes.products} className={cn(storeLink, "inline-flex min-h-11 items-center text-sm")}>
                  Browse products
                </Link>
              )}
            </div>
          </div>
          {/* Both lists stay mounted (they render nothing when empty), so removing the last line of one kind still folds away. */}
          <CartLines cart={cart} quote={quote} focusAfterRemoveRef={headingRef} />
          <ProductCartLines
            products={products}
            quote={quote}
            linkProducts={productsEnabled}
            focusAfterRemoveRef={headingRef}
            className={cn(cart.length > 0 && "mt-5 border-t border-slate-100 pt-5")}
          />
        </section>

        <div style={enterDelay(60)} className="je-in je-in-fast je-in-right space-y-4 lg:sticky lg:top-24">
          <OrderSummary cart={cart} products={products} quote={quote} action={action} />
          <ul className={cn(storeCard, storeCardPadding, "space-y-3 text-sm text-slate-600")}>
            <li className="flex gap-3">
              <Truck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
              Free delivery within Lagos.
            </li>
            <li className="flex gap-3">
              <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
              No payment to place your order. We call to confirm it first.
            </li>
            <li className="flex gap-3">
              <Package aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
              {cart.length > 0 ? "Installation by our engineers after delivery." : "Need it installed? Ask when we call to confirm."}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
