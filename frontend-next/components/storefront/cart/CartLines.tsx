"use client";

import { useEffect, useRef, type RefObject } from "react";
import { Minus, Package, Plus, Trash2 } from "lucide-react";
import { Alert, Button, Switch, toast } from "@/components/ui";
import { cartItemBaseLabel } from "@/lib/cart/orderItems";
import {
  MAX_QUANTITY,
  MIN_QUANTITY,
  addToCart,
  getCartItemKey,
  isCartFull,
  isWithSolar,
  removeFromCart,
  updateCart,
  type CartItem,
} from "@/lib/cart/store";
import { getProductCartItems, isCombinedCartFull } from "@/lib/cart/productStore";
import type { CartQuoteState } from "@/lib/cart/useCartQuote";
import { formatPrice } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { storeFocus } from "@/lib/storefront/styles";
import { RollingDigits } from "./QuantityStepper";
import { useLineMotion } from "./useLineMotion";

export type CartLinesProps = {
  cart: CartItem[];
  quote: CartQuoteState;
  /** Receives focus after a line is removed, so keyboard users aren't dropped at the top of the page. */
  focusAfterRemoveRef?: RefObject<HTMLElement | null>;
};

const stepButton = cn(
  "grid h-11 w-11 place-items-center text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent",
  storeFocus,
  "focus-visible:ring-offset-0"
);

/** Chosen option name from the package ("Without solar"), or a plain label for older carts. */
const optionName = (item: CartItem) =>
  item.options?.[isWithSolar(item) ? 1 : 0]?.name || (isWithSolar(item) ? "With solar" : "Without solar");

/**
 * Cart lines: package, label, chosen option, with-solar switch (packages with exactly two options), quantity stepper,
 * remove with an undo toast, and line totals from the server quote when it priced the line. Lines stagger in, fold away
 * when removed and slide back on undo (useLineMotion, presentation only).
 */
export default function CartLines({ cart, quote, focusAfterRemoveRef }: CartLinesProps) {
  // Latest cart for the undo action, which runs after the toast outlives this render.
  const latestCart = useRef(cart);
  const motion = useLineMotion(cart, getCartItemKey);
  useEffect(() => {
    latestCart.current = cart;
  }, [cart]);

  const restore = (item: CartItem) => {
    const cartKey = getCartItemKey(item);
    const current = latestCart.current;
    if (current.some((line) => getCartItemKey(line) === cartKey)) return;
    if (isCartFull(current) || isCombinedCartFull(current.length, getProductCartItems().length)) {
      toast.error("Your cart is full, so we couldn’t put that package back. Remove another package first.");
      return;
    }
    const { quantity, ...rest } = item;
    addToCart(rest);
    for (let count = MIN_QUANTITY; count < Math.min(quantity, MAX_QUANTITY); count += 1) updateCart(cartKey, "increase");
  };

  if (!motion.rows.length) return null;

  const remove = (item: CartItem) => {
    motion.leave(item);
    removeFromCart(getCartItemKey(item));
    focusAfterRemoveRef?.current?.focus();
    toast(`${item.name} package removed from your cart`, {
      action: { label: "Undo", onClick: () => restore(item) },
    });
  };

  return (
    <ul className="divide-y divide-slate-100">
      {motion.rows.map(({ item, ghost }, position) => {
        const cartKey = getCartItemKey(item);
        const entrance = ghost ? undefined : motion.enter(cartKey, position);
        const domId = `line-${cartKey.replace(/[^a-zA-Z0-9]/g, "-")}`;
        const label = cartItemBaseLabel(item);
        const withSolar = isWithSolar(item);
        const line = quote.status === "ok" ? quote.lines[cartKey] : undefined;
        const unavailable = line?.available === false;
        const unitPrice = line?.available ? line.price : Number(item.price);
        const lineTotal = line?.available ? line.lineTotal : Number(item.price) * Number(item.quantity);
        const canSwitch =
          item.options?.length === 2 && Number(withSolar ? item.withoutSolarPrice : item.withSolarPrice) > 0;

        return (
          <li
            key={ghost ? `leaving-${cartKey}` : cartKey}
            aria-hidden={ghost || undefined}
            inert={ghost || undefined}
            style={entrance?.style}
            className={cn("py-5 first:pt-0 last:pb-0", ghost ? "je-collapse" : entrance?.className)}
          >
            <div className={cn("flex items-start gap-3 sm:gap-4", ghost && "min-h-0 overflow-hidden")}>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                <Package aria-hidden="true" className="h-5 w-5" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <h3 id={`${domId}-title`} className="break-words text-base font-semibold text-slate-900">
                      {item.name} package
                    </h3>
                    <p className="text-sm text-slate-600">{label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {optionName(item)}
                      {item.package ? ` · ${item.package}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 sm:text-right">
                    <p className="text-base font-semibold tabular-nums text-slate-900">
                      {unavailable ? <span className="text-red-700">Unavailable</span> : formatPrice(lineTotal)}
                    </p>
                    {!unavailable && (
                      <p className="text-xs tabular-nums text-slate-500">
                        {formatPrice(unitPrice)} × {item.quantity}
                      </p>
                    )}
                  </div>
                </div>

                {unavailable && (
                  <Alert tone="danger" className="mt-3">
                    This package can’t be ordered right now. Remove it to check out, or call us for an alternative.
                  </Alert>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
                  {canSwitch && (
                    <div className="flex min-h-11 items-center">
                      <Switch
                        checked={withSolar}
                        onChange={() => updateCart(cartKey, "panel")}
                        label={
                          <>
                            With solar<span className="sr-only"> for the {item.name} package</span>
                          </>
                        }
                        description={`${formatPrice(Number(item.withSolarPrice))} each with solar`}
                      />
                    </div>
                  )}

                  <div
                    role="group"
                    aria-label={`Quantity for ${item.name} package`}
                    className="inline-flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs"
                  >
                    <button
                      type="button"
                      className={cn(stepButton, "rounded-l-lg")}
                      disabled={item.quantity <= MIN_QUANTITY}
                      onClick={() => updateCart(cartKey, "decrease")}
                      aria-label="Decrease quantity"
                    >
                      <Minus aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <output
                      aria-live="polite"
                      className="grid h-11 min-w-12 place-items-center border-x border-slate-200 px-2 text-sm font-semibold tabular-nums text-slate-900"
                    >
                      <span className="sr-only">Quantity </span>
                      <RollingDigits value={item.quantity} />
                    </output>
                    <button
                      type="button"
                      className={cn(stepButton, "rounded-r-lg")}
                      disabled={item.quantity >= MAX_QUANTITY}
                      onClick={() => updateCart(cartKey, "increase")}
                      aria-label="Increase quantity"
                      aria-describedby={item.quantity >= MAX_QUANTITY ? `${domId}-max` : undefined}
                    >
                      <Plus aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                  {item.quantity >= MAX_QUANTITY && (
                    <p id={`${domId}-max`} className="text-xs text-slate-500">
                      Up to {MAX_QUANTITY} of each package per order.
                    </p>
                  )}

                  <Button
                    variant={unavailable ? "soft-danger" : "ghost"}
                    size="md"
                    className="ml-auto h-11"
                    icon={<Trash2 aria-hidden="true" />}
                    onClick={() => remove(item)}
                  >
                    Remove<span className="sr-only"> {item.name} package</span>
                  </Button>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
