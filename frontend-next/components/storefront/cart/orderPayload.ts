// Pure checkout helpers shared by the storefront cart, checkout and success pages. No React, no browser globals at
// import time, so the payload mapping can be checked outside Next.
//
// The `/order` body must stay byte-identical to the classic checkout (components/public/cart/CheckoutForm.tsx):
// same key order, raw form values (not trimmed), `cart.map(toOrderItem)` and `"₦" + getAmount(total)`, with the
// total taken from the server quote when it priced the cart, else from the stored cart prices.
import type { OrderPayload, PlacedOrder } from "@/lib/api/types";
import { cartItemLabel, toOrderItem } from "@/lib/cart/orderItems";
import { getCartTotal, type CartItem } from "@/lib/cart/store";
import { getAmount } from "@/lib/format";

export type CheckoutValues = {
  name: string;
  phoneNumber: string;
  emailAddress: string;
  deliveryAddress: string;
};

/** The part of `useCartQuote()` the total depends on. */
export type QuoteTotal = { status: string; total: number | null };

/** Classic `displayTotal`: the quoted total when the quote succeeded, otherwise the sum of stored cart prices. */
export const resolveOrderTotal = (cart: CartItem[], quote: QuoteTotal) =>
  quote.status === "ok" && quote.total !== null ? quote.total : getCartTotal(cart);

/** `POST /order` body without the Turnstile token (add it with `turnstile.withToken`). */
export const buildOrderPayload = (values: CheckoutValues, cart: CartItem[], total: number): OrderPayload => ({
  name: values.name,
  phoneNumber: values.phoneNumber,
  emailAddress: values.emailAddress,
  deliveryAddress: values.deliveryAddress,
  order: cart.map(toOrderItem),
  total: "₦" + getAmount(total),
});

/** The order total the server computed, as display text ("₦1,150,000"), or "" if absent (classic `readOrderTotal`). */
export const readOrderTotal = (order: PlacedOrder | undefined) => {
  if (typeof order?.total === "string" && order.total.trim()) return order.total.trim();
  const amount = Number(order?.totalAmount ?? order?.total);
  return Number.isFinite(amount) && amount > 0 ? "₦" + getAmount(amount) : "";
};

/* ---------- Last order summary (sessionStorage["je/last-order"]) ---------- */

/** `items` are `[label, quantity]` pairs. `placedAt` is an ISO timestamp. */
export type LastOrder = {
  total: string;
  items: [string, number][];
  name: string;
  placedAt: string;
};

export const toLastOrder = (cart: CartItem[], { total, name, placedAt }: Omit<LastOrder, "items">): LastOrder => ({
  total,
  items: cart.map((item) => [cartItemLabel(item), Number(item.quantity)]),
  name,
  placedAt,
});

/** Parses a stored summary, or `null` when missing or malformed. */
export const parseLastOrder = (raw: string | null | undefined): LastOrder | null => {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;
    const items = Array.isArray(record.items)
      ? record.items.filter(
          (entry): entry is [string, number] =>
            Array.isArray(entry) && typeof entry[0] === "string" && Number.isFinite(Number(entry[1]))
        )
      : [];
    if (typeof record.total !== "string" || !items.length) return null;
    return {
      total: record.total,
      items: items.map(([label, quantity]) => [label, Number(quantity)]),
      name: typeof record.name === "string" ? record.name : "",
      placedAt: typeof record.placedAt === "string" ? record.placedAt : "",
    };
  } catch {
    return null;
  }
};
