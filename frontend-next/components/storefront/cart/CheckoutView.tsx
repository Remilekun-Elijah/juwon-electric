"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Phone } from "lucide-react";
import { Spinner } from "@/components/ui";
import { cartLineCount, clearProductCart, useProductCart } from "@/lib/cart/productStore";
import { clearCart, useCart } from "@/lib/cart/store";
import { useCartQuote } from "@/lib/cart/useCartQuote";
import { cn } from "@/lib/cn";
import { LAST_ORDER_KEY, primaryPhone, storeRoutes, telHref } from "@/lib/storefront/routes";
import { storeCard, storeCardPadding, storeContainer, storeLink } from "@/lib/storefront/styles";
import { useHydrated } from "@/lib/useHydrated";
import CartEmpty from "./CartEmpty";
import CartSkeleton from "./CartSkeleton";
import CheckoutForm from "./CheckoutForm";
import OrderSummary from "./OrderSummary";
import PaymentNote from "./PaymentNote";
import type { LastOrder } from "./orderPayload";

export type CheckoutViewProps = {
  gatewayEnabled: boolean;
  /** Business phone from public settings (may hold several numbers). */
  phone: string;
};

/**
 * `/checkout` client island: delivery form and a sticky order summary with the server quote (stacked on mobile, the
 * summary first so the total is visible before the form). An empty cart links back to /cart. After a successful order
 * it stores the summary for /checkout/success, clears the package and product carts and navigates there.
 */
export default function CheckoutView({ gatewayEnabled, phone }: CheckoutViewProps) {
  const router = useRouter();
  const hydrated = useHydrated();
  const cart = useCart();
  const products = useProductCart();
  const [placed, setPlaced] = useState(false);
  const quote = useCartQuote({ open: hydrated && !placed, cart, products });
  const callNumber = primaryPhone(phone);

  const handlePlaced = (order: LastOrder) => {
    setPlaced(true);
    try {
      window.sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
    } catch {
      // Storage may be unavailable (private mode); the success page then shows its generic message.
    }
    clearCart();
    clearProductCart();
    router.push(storeRoutes.checkoutSuccess);
  };

  if (!hydrated) return <CartSkeleton variant="checkout" label="Loading checkout" />;

  if (placed) {
    return (
      <div className={cn(storeContainer, "py-8 sm:py-12")}>
        <div role="status" className={cn(storeCard, "mx-auto flex max-w-xl items-center justify-center gap-3 px-6 py-12 text-slate-700")}>
          <Spinner className="h-5 w-5" />
          Order placed. Opening your confirmation…
        </div>
      </div>
    );
  }

  if (!cartLineCount(cart.length, products.length)) {
    return (
      <CartEmpty
        title="There’s nothing to check out"
        description="Your cart is empty. Add a package or product to your cart, then come back here to enter your delivery details."
        backToCart
      />
    );
  }

  return (
    <div className={cn(storeContainer, "py-8 sm:py-12")}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <div className="lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1">
          <OrderSummary
            cart={cart}
            products={products}
            quote={quote}
            showItems
            footer={
              <div className="flex flex-col gap-1 text-sm">
                <Link href={storeRoutes.cart} className={cn(storeLink, "inline-flex min-h-11 items-center gap-1.5 self-start")}>
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                  Edit cart
                </Link>
                {callNumber && (
                  <p className="flex items-center gap-2 text-slate-500">
                    <Phone aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span>
                      Prefer to order by phone? Call{" "}
                      <a href={telHref(callNumber)} className={cn(storeLink, "tabular-nums")}>
                        {callNumber}
                      </a>
                    </span>
                  </p>
                )}
              </div>
            }
          />
        </div>

        <div className={cn(storeCard, storeCardPadding, "lg:col-start-1 lg:row-start-1")}>
          <CheckoutForm
            cart={cart}
            products={products}
            quote={quote}
            onPlaced={handlePlaced}
            beforeSubmit={<PaymentNote gatewayEnabled={gatewayEnabled} />}
          />
        </div>
      </div>
    </div>
  );
}
