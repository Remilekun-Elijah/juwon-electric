"use client";

import { useSyncExternalStore } from "react";
import type { Package } from "@/lib/api/types";
import { LIMITS } from "@/lib/validation";

/**
 * Cart store (D3). Port of frontend/src/features/cart.js without Redux: a tiny external store read with
 * useSyncExternalStore. Persisted to localStorage["je/cart"] in the Vite shape, so carts saved by the Vite site
 * load here and the /cart/quote and /order payloads are unchanged.
 */

export type CartItem = Package & {
  quantity: number;
  /** Stored as the radio value "true"/"false" by Vite; booleans are tolerated. */
  withSolar: "true" | "false" | boolean | null;
  withSolarPrice?: number;
  withoutSolarPrice?: number;
  price: number;
  /** Kits text of the chosen option. */
  package?: string;
};

export type NewCartItem = Omit<CartItem, "quantity">;

const STORAGE_KEY = "je/cart";

export const MAX_CART_ITEMS = LIMITS.cartItems;
export const MIN_QUANTITY = LIMITS.quantityMin;
export const MAX_QUANTITY = LIMITS.quantityMax;

// Package ids (legacy ids) are not unique across package types/names, so cart items are identified by a composite key.
export const getCartItemKey = (item: Partial<Package> | null | undefined) =>
  [item?.type, item?.name, item?.kva, item?.volt ?? "", item?.id].join("|");

const clampQuantity = (value: unknown) => {
  const quantity = Math.trunc(Number(value));
  if (!Number.isFinite(quantity) || quantity < MIN_QUANTITY) return MIN_QUANTITY;
  return Math.min(quantity, MAX_QUANTITY);
};

export const isCartFull = (cart: CartItem[]) => Array.isArray(cart) && cart.length >= MAX_CART_ITEMS;

export const isWithSolar = (item: Pick<CartItem, "withSolar">) => item.withSolar === true || item.withSolar === "true";

const EMPTY: CartItem[] = [];
let cart: CartItem[] | null = null;
const listeners = new Set<() => void>();

const parse = (raw: string | null): CartItem[] => {
  try {
    const parsed: unknown = JSON.parse(raw ?? "null");
    return Array.isArray(parsed)
      ? parsed
          .filter((item): item is CartItem => Boolean(item) && typeof item === "object")
          .map((item) => ({ ...item, quantity: clampQuantity(item.quantity) }))
      : [];
  } catch {
    return [];
  }
};

const read = (): CartItem[] => {
  if (cart) return cart;
  if (typeof window === "undefined") return EMPTY;
  try {
    cart = parse(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    cart = [];
  }
  return cart;
};

const write = (next: CartItem[]) => {
  cart = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage may be unavailable (private mode); the in-memory cart still works for this visit.
  }
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cart = parse(event.newValue);
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
};

const getServerSnapshot = () => EMPTY;

/** Current cart items (empty during server render and hydration). */
export function useCart() {
  return useSyncExternalStore(subscribe, read, getServerSnapshot);
}

/** Sum of price × quantity (Vite `getTotal`). */
export const getCartTotal = (items: CartItem[]) =>
  items.reduce((sum, item) => sum + Number(item?.price) * Number(item?.quantity), 0);

export function addToCart(item: NewCartItem) {
  const current = read();
  // The UI checks isCartFull() first and explains the limit; this is a safety net.
  if (current.length >= MAX_CART_ITEMS) return;
  write([...current, { ...item, quantity: 1 }]);
}

export function removeFromCart(cartKey: string) {
  write(read().filter((item) => getCartItemKey(item) !== cartKey));
}

export function updateCart(cartKey: string, action: "increase" | "decrease" | "panel") {
  const next = read().map((item) => {
    if (getCartItemKey(item) !== cartKey) return item;
    if (action === "increase" && item.quantity < MAX_QUANTITY) return { ...item, quantity: item.quantity + 1 };
    if (action === "decrease" && item.quantity > MIN_QUANTITY) return { ...item, quantity: item.quantity - 1 };
    if (action === "panel") {
      return isWithSolar(item)
        ? { ...item, price: Number(item.withoutSolarPrice), withSolar: "false" as const }
        : { ...item, price: Number(item.withSolarPrice), withSolar: "true" as const };
    }
    return item;
  });
  write(next);
}

/** Replaces stored prices with the server's quote: [{ cartKey, price }]. */
export function applyQuotePrices(lines: { cartKey: string; price?: number }[]) {
  const prices = new Map(
    lines
      .filter((line): line is { cartKey: string; price: number } => Number.isFinite(line?.price) && Number(line.price) > 0)
      .map((line) => [line.cartKey, line.price])
  );
  let changed = false;
  const next = read().map((item) => {
    const price = prices.get(getCartItemKey(item));
    if (price === undefined || Number(item.price) === price) return item;
    changed = true;
    return isWithSolar(item) ? { ...item, price, withSolarPrice: price } : { ...item, price, withoutSolarPrice: price };
  });
  if (changed) write(next);
}

export function clearCart() {
  write([]);
}
