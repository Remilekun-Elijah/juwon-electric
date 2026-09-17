"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { clearCart, getCartItemKey, getCartTotal, useCart } from "@/lib/cart/store";
import { cn } from "@/lib/cn";
import { buttonBase, buttonHover, buttonSmall, siteContainer } from "@/lib/publicStyles";
import { routes } from "@/lib/site";
import { useHydrated } from "@/lib/useHydrated";
import CartItem from "./CartItem";
import CheckoutDialog from "./CheckoutDialog";
import EmptyCart from "./EmptyCart";

/** Port of frontend/src/pages/Cart/Cart.jsx with the checkout modal and the "order placed" modal. */
export default function CartView() {
  const cart = useCart();
  const hydrated = useHydrated();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [placed, setPlaced] = useState<{ name: string; total: string } | null>(null);
  const total = getCartTotal(cart);

  return (
    <div className="bg-cover bg-center py-20" style={{ backgroundImage: "url('/contactBackground.svg')" }}>
      <div className={siteContainer}>
        <div className="mt-12 rounded-lg bg-white p-5 shadow-lg md:p-10">
          <div className="mb-5 flex items-center justify-between border-b-2 border-deep_red pb-3">
            <h1 className="sora-bold text-xl leading-snug text-deep_red md:text-2xl">Review Your Cart</h1>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className={cn(buttonSmall, "border border-black text-black transition-colors hover:bg-black hover:text-white")}
              >
                <Trash2 aria-hidden="true" className="h-5 w-5" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {!hydrated ? (
            <div aria-busy="true" aria-label="Loading your cart" className="space-y-5">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : cart.length ? (
            <ul aria-label="Cart items">
              {cart.map((item) => (
                <CartItem key={getCartItemKey(item)} item={item} />
              ))}
            </ul>
          ) : (
            <EmptyCart />
          )}

          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => setCheckoutOpen(true)}
              className={cn(buttonBase, buttonHover, "mt-7 w-full border bg-brand-500 text-white")}
            >
              Proceed
            </button>
          )}
        </div>
      </div>

      <CheckoutDialog
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cart={cart}
        total={total}
        onPlaced={(result) => {
          setCheckoutOpen(false);
          setPlaced(result);
        }}
      />

      {/* Port of frontend/src/pages/Checkout/OrderSentModal.jsx */}
      <Dialog open={Boolean(placed)} onClose={() => setPlaced(null)} className="max-w-[550px]">
        <div className="flex flex-col items-center justify-center px-5 text-center" role="status">
          <Image src="/order.svg" alt="" width={228} height={152} />
          <p className="mt-2">Congrats {placed?.name},</p>
          <p className="inter-bold my-3 block text-lg">Your order has been placed!</p>
          {placed?.total && (
            <p className="inter-regular mb-3 block text-base md:px-3">
              Order total: <span className="inter-bold">{placed.total}</span>
            </p>
          )}
          <p className="inter-regular mb-5 block text-base md:px-3">
            We’ll send a delivery confirmation text as soon as your order is packed.
          </p>
          <div className="mb-5 flex flex-wrap justify-center gap-3 md:gap-10">
            <Link
              href={routes.home}
              className="inline-flex min-h-[44px] items-center rounded-lg border-2 border-brand-500 px-5 py-2 text-brand-500 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Go Home
            </Link>
            <Link
              href={routes.packages}
              className="inline-flex min-h-[44px] items-center rounded-lg border-0 bg-brand-500 px-5 py-2 text-white transition-opacity duration-150 hover:opacity-90 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Go To Packages
            </Link>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
