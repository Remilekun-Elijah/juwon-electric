// Pure checkout helpers shared by the storefront cart, checkout and success pages. No React, no browser globals at
// import time, so the payload mapping can be checked outside Next.
//
// The `/order` body must stay byte-identical to the classic checkout (components/public/cart/CheckoutForm.tsx):
// same key order, raw form values (not trimmed), `cart.map(toOrderItem)` and `"₦" + getAmount(total)`, with the
// total taken from the server quote when it priced the cart, else from the stored cart prices.
//
// Commerce v3 §6: catalogue product lines follow the package items as `{ type: "product", productId, quantity }`.
// Every product argument is optional and defaults to none, so a package-only cart builds exactly the classic body.
import type { OrderPayload, PlacedOrder } from "@/lib/api/types";
import { cartItemLabel, toOrderItem, toProductOrderItem } from "@/lib/cart/orderItems";
import { getProductCartTotal, type ProductCartItem } from "@/lib/cart/productStore";
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
export const resolveOrderTotal = (cart: CartItem[], quote: QuoteTotal, products: ProductCartItem[] = []) =>
  quote.status === "ok" && quote.total !== null
    ? quote.total
    : products.length
      ? getCartTotal(cart) + getProductCartTotal(products)
      : getCartTotal(cart);

/** `POST /order` body without the Turnstile token (add it with `turnstile.withToken`). */
export const buildOrderPayload = (
  values: CheckoutValues,
  cart: CartItem[],
  total: number,
  products: ProductCartItem[] = []
): OrderPayload => ({
  name: values.name,
  phoneNumber: values.phoneNumber,
  emailAddress: values.emailAddress,
  deliveryAddress: values.deliveryAddress,
  order: [...cart.map(toOrderItem), ...products.map(toProductOrderItem)],
  total: "₦" + getAmount(total),
});

/** The order total the server computed, as display text ("₦1,150,000"), or "" if absent (classic `readOrderTotal`). */
export const readOrderTotal = (order: PlacedOrder | undefined) => {
  if (typeof order?.total === "string" && order.total.trim()) return order.total.trim();
  const amount = Number(order?.totalAmount ?? order?.total);
  return Number.isFinite(amount) && amount > 0 ? "₦" + getAmount(amount) : "";
};

/* ---------- Last order summary (sessionStorage["je/last-order"]) ---------- */

export type LastOrderKind = "package" | "product";

/**
 * `items` are `[label, quantity]` pairs, with a third `"product"` entry for catalogue products (package lines keep the
 * two-entry shape). `placedAt` is an ISO timestamp.
 */
export type LastOrder = {
  total: string;
  items: ([string, number] | [string, number, LastOrderKind])[];
  name: string;
  placedAt: string;
};

/** Product label for summaries: "Felicity 200Ah battery (SKU BAT-200)". */
export const productLineLabel = (item: Pick<ProductCartItem, "name" | "sku">) =>
  item.sku ? `${item.name} (SKU ${item.sku})` : item.name;

export const toLastOrder = (
  cart: CartItem[],
  { total, name, placedAt }: Omit<LastOrder, "items">,
  products: ProductCartItem[] = []
): LastOrder => ({
  total,
  items: [
    ...cart.map((item): [string, number] => [cartItemLabel(item), Number(item.quantity)]),
    ...products.map((item): [string, number, LastOrderKind] => [productLineLabel(item), Number(item.quantity), "product"]),
  ],
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
          (entry): entry is [string, number, unknown?] =>
            Array.isArray(entry) && typeof entry[0] === "string" && Number.isFinite(Number(entry[1]))
        )
      : [];
    if (typeof record.total !== "string" || !items.length) return null;
    return {
      total: record.total,
      items: items.map(([label, quantity, kind]): LastOrder["items"][number] =>
        kind === "product" ? [label, Number(quantity), "product"] : [label, Number(quantity)]
      ),
      name: typeof record.name === "string" ? record.name : "",
      placedAt: typeof record.placedAt === "string" ? record.placedAt : "",
    };
  } catch {
    return null;
  }
};
