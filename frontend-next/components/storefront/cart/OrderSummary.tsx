"use client";

import type { ReactNode } from "react";
import { Alert, Button, Spinner } from "@/components/ui";
import { cartItemLabel } from "@/lib/cart/orderItems";
import { getProductCartKey, removeProductFromCart, type ProductCartItem } from "@/lib/cart/productStore";
import { getCartItemKey, removeFromCart, type CartItem } from "@/lib/cart/store";
import { QUOTE_FALLBACK_NOTE, type CartQuoteState } from "@/lib/cart/useCartQuote";
import { formatPrice } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { storeCard, storeCardPadding } from "@/lib/storefront/styles";
import { productLineLabel, resolveOrderTotal } from "./orderPayload";

export type OrderSummaryProps = {
  cart: CartItem[];
  /** Catalogue product lines (Commerce v3), listed after the packages. */
  products?: ProductCartItem[];
  quote: CartQuoteState;
  /** List every line (checkout). The cart page already shows lines next to the summary. */
  showItems?: boolean;
  /** Primary action under the totals ("Proceed to checkout"). */
  action?: ReactNode;
  /** Extra content at the bottom of the card (links, notes). */
  footer?: ReactNode;
  className?: string;
};

export const UNAVAILABLE_MESSAGE = "Some items in your cart are no longer available. Remove them to place your order.";

const NO_PRODUCTS: ProductCartItem[] = [];

/**
 * Totals card for the cart and checkout, in the admin order-details style. The total is the server quote when it
 * priced the cart (classic `displayTotal`), otherwise the stored prices with `QUOTE_FALLBACK_NOTE`.
 */
export default function OrderSummary({ cart, products = NO_PRODUCTS, quote, showItems = false, action, footer, className }: OrderSummaryProps) {
  const quoted = quote.status === "ok";
  const total = resolveOrderTotal(cart, quote, products);
  const units = [...cart, ...products].reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return (
    <section aria-labelledby="order-summary-heading" aria-busy={quote.status === "loading" || undefined} className={cn(storeCard, storeCardPadding, className)}>
      <h2 id="order-summary-heading" className="text-base font-semibold text-slate-900">
        Order summary
      </h2>

      {showItems && (
        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {cart.map((item) => {
            const cartKey = getCartItemKey(item);
            const line = quoted ? quote.lines[cartKey] : undefined;
            const label = cartItemLabel(item);
            const amount = line?.available ? line.lineTotal : Number(item.price) * Number(item.quantity);

            return (
              <li key={cartKey} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium text-slate-900">{item.name} package</p>
                  <p className="text-xs text-slate-500">
                    {label} × {item.quantity}
                  </p>
                </div>
                {line && !line.available ? (
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium text-red-700">Unavailable</p>
                    <Button variant="link" size="sm" className="min-h-11 text-xs" onClick={() => removeFromCart(cartKey)}>
                      Remove<span className="sr-only"> {label}</span>
                    </Button>
                  </div>
                ) : (
                  <p className="shrink-0 text-sm font-medium tabular-nums text-slate-900">{formatPrice(amount)}</p>
                )}
              </li>
            );
          })}
          {products.map((item) => {
            const cartKey = getProductCartKey(item.productId);
            const line = quoted ? quote.lines[cartKey] : undefined;
            const amount = line?.available ? line.lineTotal : Number(item.price) * Number(item.quantity);

            return (
              <li key={cartKey} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    {item.sku ? `SKU ${item.sku} ` : ""}× {item.quantity}
                  </p>
                </div>
                {line && !line.available ? (
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium text-red-700">Unavailable</p>
                    <Button variant="link" size="sm" className="min-h-11 text-xs" onClick={() => removeProductFromCart(item.productId)}>
                      Remove<span className="sr-only"> {productLineLabel(item)}</span>
                    </Button>
                  </div>
                ) : (
                  <p className="shrink-0 text-sm font-medium tabular-nums text-slate-900">{formatPrice(amount)}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-slate-600">
            Subtotal <span className="text-slate-500">({units} {units === 1 ? "unit" : "units"})</span>
          </dt>
          <dd className="font-medium tabular-nums text-slate-900">{formatPrice(total)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-slate-600">Delivery within Lagos</dt>
          <dd className="font-medium text-green-700">Free</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t border-slate-200 pt-3">
          <dt className="text-base font-semibold text-slate-900">Total</dt>
          <dd className="text-xl font-bold tabular-nums text-slate-900">{formatPrice(total)}</dd>
        </div>
      </dl>

      <div aria-live="polite" className="mt-3 text-sm">
        {quote.status === "loading" && (
          <p className="flex items-center gap-2 text-slate-500">
            <Spinner className="h-4 w-4" />
            Checking current prices…
          </p>
        )}
        {quote.status === "ok" && quote.unavailableKeys.length === 0 && <p className="text-slate-500">Prices confirmed just now.</p>}
        {quote.status === "fallback" && <p className="text-slate-500">{QUOTE_FALLBACK_NOTE}</p>}
      </div>
      {quote.unavailableKeys.length > 0 && (
        <Alert tone="danger" className="mt-3">
          {UNAVAILABLE_MESSAGE}
        </Alert>
      )}

      {action && <div className="mt-5">{action}</div>}
      {footer && <div className="mt-4">{footer}</div>}
    </section>
  );
}
