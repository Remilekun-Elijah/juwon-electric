"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight, Package, ShieldCheck, Truck } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui";
import { useCart } from "@/lib/cart/store";
import { useCartQuote } from "@/lib/cart/useCartQuote";
import { cn } from "@/lib/cn";
import { storeRoutes } from "@/lib/storefront/routes";
import { storeCard, storeCardPadding, storeContainer, storeLink } from "@/lib/storefront/styles";
import { useHydrated } from "@/lib/useHydrated";
import CartEmpty from "./CartEmpty";
import CartLines from "./CartLines";
import CartSkeleton from "./CartSkeleton";
import OrderSummary from "./OrderSummary";

/**
 * `/cart` client island: stored cart lines with a server quote and the order summary. The cart is empty on the server
 * and during hydration, so a skeleton shows until the stored cart is read.
 */
export default function CartView() {
  const hydrated = useHydrated();
  const cart = useCart();
  const quote = useCartQuote({ open: hydrated, cart });
  const headingRef = useRef<HTMLHeadingElement>(null);

  if (!hydrated) return <CartSkeleton />;
  if (!cart.length) return <CartEmpty />;

  const blockedReason =
    quote.status === "loading"
      ? "Checking current prices…"
      : quote.unavailableKeys.length
        ? "Remove unavailable packages to check out."
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
        <section aria-labelledby="cart-items-heading" className={cn(storeCard, storeCardPadding)}>
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <h2 id="cart-items-heading" ref={headingRef} tabIndex={-1} className="text-base font-semibold text-slate-900 focus:outline-hidden">
              Packages <span className="font-normal text-slate-500">({cart.length})</span>
            </h2>
            <Link href={storeRoutes.packages} className={cn(storeLink, "inline-flex min-h-11 items-center text-sm")}>
              Add another package
            </Link>
          </div>
          <CartLines cart={cart} quote={quote} focusAfterRemoveRef={headingRef} />
        </section>

        <div className="space-y-4 lg:sticky lg:top-24">
          <OrderSummary cart={cart} quote={quote} action={action} />
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
              Installation by our engineers after delivery.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
