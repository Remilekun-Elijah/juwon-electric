// Plain module (server and client safe): the slim product props the storefront add-to-cart islands receive, so server
// pages don't serialise descriptions and attributes into client components.
import type { PublicProduct } from "@/lib/api/types";

export type CartProduct = {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  brand: string | null;
  image: string | null;
  price: number;
  inStock: boolean;
};

export const toCartProduct = (product: PublicProduct): CartProduct => ({
  productId: product.id,
  slug: product.slug || product.id,
  name: product.name,
  sku: product.sku || "",
  brand: product.brand || null,
  image: product.images?.[0] || null,
  price: Number(product.price),
  inStock: product.inStock === true,
});

/** Online orders need a positive price and stock (Commerce v3 §3.2; the server checks the exact quantity). */
export const canBuyOnline = (product: Pick<CartProduct, "price" | "inStock">) => product.inStock && Number(product.price) > 0;

/** Public stock quantity is unknown, so the product page stepper stops here (the cart allows up to 100). */
export const PRODUCT_PAGE_MAX_QUANTITY = 10;
