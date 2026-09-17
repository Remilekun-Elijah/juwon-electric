"use client";

import { ShoppingCart } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { cartItemLabel } from "@/lib/cart/orderItems";
import { getCartItemKey, removeFromCart, type CartItem } from "@/lib/cart/store";
import { QUOTE_FALLBACK_NOTE, useCartQuote } from "@/lib/cart/useCartQuote";
import { cn } from "@/lib/cn";
import { getAmount } from "@/lib/format";
import { buttonHover, buttonSmall } from "@/lib/publicStyles";
import CheckoutForm from "./CheckoutForm";

type Props = {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  total: number;
  onPlaced: (result: { name: string; total: string }) => void;
};

/** Order summary with the server quote. Port of frontend/src/pages/Checkout/Checkout.jsx. */
export default function CheckoutDialog({ open, onClose, cart, total, onPlaced }: Props) {
  // Nothing left to order (e.g. every unavailable line was removed) closes the dialog, as in Vite.
  const visible = open && cart.length > 0;
  const quote = useCartQuote({ open: visible, cart });
  const quoted = quote.status === "ok";
  const displayTotal = quoted && quote.total !== null ? quote.total : total;

  return (
    <Dialog
      open={visible}
      onClose={onClose}
      title={
        <span className="inter-bold flex items-center gap-3 text-lg">
          <ShoppingCart aria-hidden="true" className="h-6 w-6" />
          Check Out
        </span>
      }
      className="max-w-[550px]"
    >
      <h3 className="inter-regular text-left text-base text-[#0B0B0B]">Order Summary</h3>

      <div className="mt-4 rounded-lg border-2 border-dashed py-4" aria-busy={quote.status === "loading" || undefined}>
        <div className="mx-3">
          <ul>
            {cart.map((item) => {
              const cartKey = getCartItemKey(item);
              const line = quoted ? quote.lines[cartKey] : undefined;
              const amount = line?.available ? line.lineTotal : Number(item.price) * Number(item.quantity);

              if (line && !line.available) {
                return (
                  <li key={cartKey} className="mt-2">
                    <p className="inter-regular text-base text-[#878787]">
                      {cartItemLabel(item)} × {item.quantity}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <span className="inter-medium block text-deep_red">Unavailable</span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(cartKey)}
                        className={cn(buttonSmall, buttonHover, "cursor-pointer bg-brand-500 text-white")}
                      >
                        Remove<span className="sr-only"> {cartItemLabel(item)}</span>
                      </button>
                    </div>
                  </li>
                );
              }

              return (
                <li key={cartKey} className="mt-2 flex items-baseline justify-between gap-2">
                  <p className="inter-regular text-base text-[#878787]">
                    {cartItemLabel(item)} × {item.quantity}
                  </p>
                  <span className="inter-medium block shrink-0 text-[#191A15]">₦{getAmount(amount)}</span>
                </li>
              );
            })}
          </ul>

          <dl>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <dt className="inter-regular text-base text-[#878787]">Sub total</dt>
              <dd className="inter-medium block text-[#191A15]">₦{getAmount(displayTotal)}</dd>
            </div>
            <div className="my-2 flex items-baseline justify-between gap-2">
              <dt className="inter-regular text-base text-[#878787]">Discount</dt>
              <dd className="inter-medium block text-[#191A15]">₦0.00</dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="inter-regular text-base text-[#878787]">Delivery within Lagos</dt>
              <dd className="inter-medium block text-base text-brand-500">FREE</dd>
            </div>
            <div className="mb-2 mt-3 flex items-baseline justify-between gap-2">
              <dt className="inter-bold text-base text-[#878787]">Total</dt>
              <dd className="inter-bold block text-xl text-[#191A15]">₦{getAmount(displayTotal)}</dd>
            </div>
          </dl>

          <div aria-live="polite">
            {quote.status === "loading" && <p className="inter-regular text-sm text-[#878787]">Checking current prices…</p>}
            {quote.status === "fallback" && <p className="inter-regular text-sm text-[#878787]">{QUOTE_FALLBACK_NOTE}</p>}
          </div>
          {quote.unavailableKeys.length > 0 && (
            <p role="alert" className="inter-regular text-sm text-deep_red">
              Some items are no longer available. Remove them to place your order.
            </p>
          )}
        </div>
      </div>

      <CheckoutForm cart={cart} total={displayTotal} quote={quote} onPlaced={onPlaced} />
    </Dialog>
  );
}
