"use client";

import { useCallback, useEffect, useEffectEvent, useMemo, useState } from "react";
import { ApiError, type ApiEnvelope } from "@/lib/api/client";
import { quoteCart } from "@/lib/api/public";
import type { CartQuote, CartRequestItem } from "@/lib/api/types";
import { toOrderItem, toProductOrderItem } from "./orderItems";
import { applyProductQuotePrices, getProductCartKey, type ProductCartItem } from "./productStore";
import { applyQuotePrices, getCartItemKey, type CartItem } from "./store";

// Server-side prices for the checkout (POST /cart/quote). Port of frontend/src/pages/Checkout/useCartQuote.js.
//
// Response shape assumed (Express and Worker today):
//   200 { success, data: { items: [{ price, quantity, lineTotal, ... }], total } }
// with `items` in request order. `price`/`total` may be numbers or "₦1,000" strings; `unitPrice`/`totalAmount` are
// preferred when present. A per-line `available: false` (or `unavailable: true`) is honoured if a backend reports it.
// When any line can't be priced both backends reject the whole request with 400 "Some items in your cart are no
// longer available…"; the unavailable lines are then found by quoting halves of the cart (bounded requests).

const QUOTE_TIMEOUT_MS = 15000;
const MAX_QUOTE_REQUESTS = 16;

export const QUOTE_FALLBACK_NOTE =
  "We couldn’t confirm current prices. Prices will be confirmed when your order is processed.";

export type QuoteLine = { available: false } | { available: true; price: number; lineTotal: number };

const toAmount = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (typeof value !== "string") return NaN;
  const digits = value.replace(/[^\d.]/g, "");
  return digits ? Number(digits) : NaN;
};

const isUnavailableError = (error: unknown) =>
  error instanceof ApiError && error.status === 400 && /no longer available|unavailable/i.test(error.message || "");

export const readQuote = (response: ApiEnvelope<CartQuote> | null, count: number) => {
  const data = response?.data as CartQuote | CartQuote["items"] | undefined;
  const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : null;
  if (!items || items.length !== count) return null;
  const meta = Array.isArray(data) ? undefined : data;

  const flagged = new Set(Array.isArray(meta?.unavailable) ? meta.unavailable.filter(Number.isInteger) : []);
  const lines: QuoteLine[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (flagged.has(index) || item?.available === false || item?.unavailable === true) {
      lines.push({ available: false });
      continue;
    }
    const price = toAmount(item?.unitPrice ?? item?.price);
    if (!(price > 0)) return null;
    const quantity = toAmount(item?.quantity);
    const lineTotal = toAmount(item?.lineTotal);
    lines.push({ available: true, price, lineTotal: lineTotal > 0 ? lineTotal : price * (quantity > 0 ? quantity : 1) });
  }

  const total = toAmount(meta?.totalAmount ?? meta?.total);
  return { lines, total: total > 0 ? total : null };
};

const sumLines = (lines: QuoteLine[]) => lines.reduce((sum, line) => sum + (line.available ? line.lineTotal : 0), 0);

type Budget = { left: number };

/** Quotes `items`; on an "unavailable" 400 splits the list to find the lines that can't be priced. */
export const quoteItems = async (
  items: CartRequestItem[],
  { signal, budget }: { signal: AbortSignal; budget: Budget }
): Promise<{ lines: QuoteLine[]; total: number }> => {
  if (budget.left <= 0) throw new Error("Quote request budget exhausted");
  budget.left -= 1;
  try {
    const response = await quoteCart(items, { signal });
    const quote = readQuote(response, items.length);
    if (!quote) throw new ApiError("Invalid quote response", 0);
    const available = quote.lines.every((line) => line.available);
    return { lines: quote.lines, total: available && quote.total !== null ? quote.total : sumLines(quote.lines) };
  } catch (error) {
    if (!isUnavailableError(error)) throw error;
    if (items.length === 1) return { lines: [{ available: false }], total: 0 };
    const middle = Math.ceil(items.length / 2);
    const first = await quoteItems(items.slice(0, middle), { signal, budget });
    const second = await quoteItems(items.slice(middle), { signal, budget });
    const lines = [...first.lines, ...second.lines];
    return { lines, total: sumLines(lines) };
  }
};

// Fields that affect pricing; the stored price is excluded so applying a quote doesn't re-trigger it.
// Product lines (Commerce v3) are appended only when present, so a package-only signature is unchanged.
const quoteSignature = (cart: CartItem[], products: ProductCartItem[]) =>
  JSON.stringify([
    ...cart.map((item) => {
      const { price, ...fields } = toOrderItem(item);
      void price;
      return [getCartItemKey(item), fields];
    }),
    ...products.map((item) => [getProductCartKey(item.productId), toProductOrderItem(item)]),
  ]);

const NO_PRODUCTS: ProductCartItem[] = [];

export type QuoteStatus = "idle" | "loading" | "ok" | "fallback";

type Settled = { key: string; status: "ok" | "fallback"; lines: Record<string, QuoteLine>; total: number | null };

/**
 * useCartQuote({ open, cart, products? }) → { status, lines, total, unavailableKeys, blocked, refresh }
 * - products: catalogue product lines (Commerce v3), quoted after the package items; omit for a package-only cart,
 *   which then sends exactly the same request as before
 * - status: "idle" | "loading" | "ok" | "fallback"
 * - lines: { [cartKey]: { available, price, lineTotal } } (only when status is "ok"); product lines are keyed by
 *   `getProductCartKey(productId)`
 * - blocked: true while quoting or when some lines can't be priced
 * The loading/idle states are derived from the request key, so the effect only sets state from async callbacks.
 */
export function useCartQuote({
  open,
  cart,
  products = NO_PRODUCTS,
}: {
  open: boolean;
  cart: CartItem[];
  products?: ProductCartItem[];
}) {
  const [settled, setSettled] = useState<Settled | null>(null);
  const [nonce, setNonce] = useState(0);

  const signature = useMemo(() => quoteSignature(cart, products), [cart, products]);
  const hasItems = cart.length + products.length > 0;
  const active = open && hasItems;
  const key = `${signature}#${nonce}`;

  const startQuote = useEffectEvent((requestKey: string, signal: AbortSignal) => {
    const packageCount = cart.length;
    const keys = [...cart.map(getCartItemKey), ...products.map((item) => getProductCartKey(item.productId))];
    // Package items first (unchanged mapping), then product items; quote lines map back by index.
    const items: CartRequestItem[] = [...cart.map(toOrderItem), ...products.map(toProductOrderItem)];
    return quoteItems(items, { signal, budget: { left: MAX_QUOTE_REQUESTS } })
      .then(({ lines, total }) => {
        const byKey: Record<string, QuoteLine> = {};
        lines.forEach((line, index) => {
          byKey[keys[index]] = line;
        });
        setSettled({ key: requestKey, status: "ok", lines: byKey, total });
        applyQuotePrices(
          lines
            .slice(0, packageCount)
            .flatMap((line, index) => (line.available ? [{ cartKey: keys[index], price: line.price }] : []))
        );
        const productLines = lines.slice(packageCount);
        if (productLines.length) {
          applyProductQuotePrices(
            productLines.flatMap((line, index) =>
              line.available && products[index] ? [{ productId: products[index].productId, price: line.price }] : []
            )
          );
        }
      })
      .catch(() => {
        if (!signal.aborted) setSettled({ key: requestKey, status: "fallback", lines: {}, total: null });
      });
  });

  useEffect(() => {
    if (!active) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), QUOTE_TIMEOUT_MS);
    // A timeout aborts the request; report it as a fallback rather than leaving the checkout loading.
    const onAbort = () => setSettled((current) => (current?.key === key ? current : { key, status: "fallback", lines: {}, total: null }));
    controller.signal.addEventListener("abort", onAbort);
    void startQuote(key, controller.signal).finally(() => window.clearTimeout(timer));

    return () => {
      controller.signal.removeEventListener("abort", onAbort);
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [active, key]);

  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  const current = active && settled?.key === key ? settled : null;
  const status: QuoteStatus = !active ? "idle" : current ? current.status : "loading";
  const lines = current?.status === "ok" ? current.lines : {};
  const total = current?.status === "ok" ? current.total : null;
  const unavailableKeys = status === "ok" ? Object.keys(lines).filter((cartKey) => lines[cartKey]?.available === false) : [];

  return {
    status,
    lines,
    total,
    unavailableKeys,
    blocked: status === "loading" || unavailableKeys.length > 0,
    refresh,
  };
}

export type CartQuoteState = ReturnType<typeof useCartQuote>;

export default useCartQuote;
