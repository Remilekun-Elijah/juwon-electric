"use client";

import { useSyncExternalStore } from "react";
import { MAX_CART_ITEMS, MAX_QUANTITY, MIN_QUANTITY, getCartItems } from "./store";

/**
 * Product cart store (Commerce v3 §6). Catalogue products live in their own key, localStorage["je/cart-products"], so
 * the package cart in "je/cart" keeps its classic shape and the classic site simply ignores product lines.
 * Same pattern as ./store: a tiny external store read with useSyncExternalStore, synced across tabs with the storage
 * event. Quantities are clamped to 1–100 and the line limit (MAX_CART_ITEMS) is shared with package lines.
 */

export type ProductCartItem = {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  brand: string | null;
  image: string | null;
  /** Last known unit price; the server quote replaces it. */
  price: number;
  quantity: number;
};

export type NewProductCartItem = Omit<ProductCartItem, "quantity">;

export const PRODUCT_STORAGE_KEY = "je/cart-products";

const MAX_ID_LENGTH = 64;

const clampQuantity = (value: unknown) => {
  const quantity = Math.trunc(Number(value));
  if (!Number.isFinite(quantity) || quantity < MIN_QUANTITY) return MIN_QUANTITY;
  return Math.min(quantity, MAX_QUANTITY);
};

const text = (value: unknown) => (typeof value === "string" ? value : "");
const optionalText = (value: unknown) => (typeof value === "string" && value.trim() ? value : null);

/** A clean stored line, or `null` for anything that can't be ordered (no product id, bad name). */
const sanitize = (value: unknown): ProductCartItem | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const productId = text(record.productId).trim();
  const name = text(record.name).trim();
  if (!productId || productId.length > MAX_ID_LENGTH || !name) return null;
  const price = Number(record.price);
  return {
    productId,
    slug: text(record.slug),
    name,
    sku: text(record.sku),
    brand: optionalText(record.brand),
    image: optionalText(record.image),
    price: Number.isFinite(price) && price >= 0 ? price : 0,
    quantity: clampQuantity(record.quantity),
  };
};

/** Parses stored JSON, dropping malformed and duplicate lines and anything past the line limit. Never throws. */
export const parseProductCart = (raw: string | null | undefined): ProductCartItem[] => {
  try {
    const parsed: unknown = JSON.parse(raw ?? "null");
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const items: ProductCartItem[] = [];
    for (const entry of parsed) {
      const item = sanitize(entry);
      if (!item || seen.has(item.productId)) continue;
      seen.add(item.productId);
      items.push(item);
      if (items.length >= MAX_CART_ITEMS) break;
    }
    return items;
  } catch {
    return [];
  }
};

const EMPTY: ProductCartItem[] = [];
let products: ProductCartItem[] | null = null;
const listeners = new Set<() => void>();

const read = (): ProductCartItem[] => {
  if (products) return products;
  if (typeof window === "undefined") return EMPTY;
  try {
    products = parseProductCart(window.localStorage.getItem(PRODUCT_STORAGE_KEY));
  } catch {
    products = [];
  }
  return products;
};

const write = (next: ProductCartItem[]) => {
  products = next;
  try {
    window.localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage may be unavailable (private mode); the in-memory cart still works for this visit.
  }
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    // `key` is null when another tab clears all storage.
    if (event.key !== PRODUCT_STORAGE_KEY && event.key !== null) return;
    products = parseProductCart(event.newValue);
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
};

const getServerSnapshot = () => EMPTY;

/** Current product lines (empty during server render and hydration). */
export function useProductCart() {
  return useSyncExternalStore(subscribe, read, getServerSnapshot);
}

/** Current product lines outside React. */
export const getProductCartItems = (): ProductCartItem[] => read();

/** Package lines plus product lines. */
export const cartLineCount = (packageLines: number, productLines: number) => packageLines + productLines;

/** True when no new line (package or product) fits. */
export const isCombinedCartFull = (packageLines: number, productLines: number) =>
  cartLineCount(packageLines, productLines) >= MAX_CART_ITEMS;

export type AddProductResult = "added" | "increased" | "full" | "invalid";

/**
 * Adds `quantity` of a product. A product already in the cart gets the quantity added to its line (clamped to 100),
 * which never needs a new line. A new line is refused with "full" when package and product lines reach the limit.
 */
export function addProductToCart(item: NewProductCartItem, quantity = 1): AddProductResult {
  const line = sanitize({ ...item, quantity: clampQuantity(quantity) });
  if (!line) return "invalid";
  const current = read();
  const existing = current.find((entry) => entry.productId === line.productId);
  if (existing) {
    write(
      current.map((entry) =>
        entry.productId === line.productId
          ? { ...entry, ...line, quantity: clampQuantity(entry.quantity + line.quantity) }
          : entry
      )
    );
    return "increased";
  }
  if (isCombinedCartFull(getCartItems().length, current.length)) return "full";
  write([...current, line]);
  return "added";
}

/** Sets a line's quantity (clamped to 1–100). */
export function setProductQuantity(productId: string, quantity: number) {
  const next = clampQuantity(quantity);
  const current = read();
  if (!current.some((entry) => entry.productId === productId && entry.quantity !== next)) return;
  write(current.map((entry) => (entry.productId === productId ? { ...entry, quantity: next } : entry)));
}

export function removeProductFromCart(productId: string) {
  const current = read();
  if (!current.some((entry) => entry.productId === productId)) return;
  write(current.filter((entry) => entry.productId !== productId));
}

export function clearProductCart() {
  write([]);
}

/** Replaces stored unit prices with the server's quote: [{ productId, price }]. */
export function applyProductQuotePrices(lines: { productId: string; price?: number }[]) {
  const prices = new Map(
    lines
      .filter((line): line is { productId: string; price: number } => Number.isFinite(line?.price) && Number(line.price) > 0)
      .map((line) => [line.productId, line.price])
  );
  let changed = false;
  const next = read().map((entry) => {
    const price = prices.get(entry.productId);
    if (price === undefined || entry.price === price) return entry;
    changed = true;
    return { ...entry, price };
  });
  if (changed) write(next);
}

/** Sum of stored price × quantity. */
export const getProductCartTotal = (items: ProductCartItem[]) =>
  items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);

/** Stable cart key for a product line; never collides with package keys (those have five `|` parts). */
export const getProductCartKey = (productId: string) => `product|${productId}`;
