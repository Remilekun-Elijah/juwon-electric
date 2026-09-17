"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/components/ui";
import { addProductToCart, useProductCart } from "@/lib/cart/productStore";
import { MAX_CART_ITEMS } from "@/lib/cart/store";
import type { CartProduct } from "@/lib/storefront/cartProduct";
import { storeRoutes } from "@/lib/storefront/routes";

/**
 * Adds a catalogue product to the product cart with the storefront feedback: a success toast with a "View cart"
 * action, a full-cart explanation, and a polite announcement for screen readers (render `announcement` in a live region).
 */
export function useAddProductToCart(product: CartProduct) {
  const router = useRouter();
  const products = useProductCart();
  const [announcement, setAnnouncement] = useState("");
  const inCart = products.find((line) => line.productId === product.productId)?.quantity ?? 0;

  const add = (quantity: number) => {
    const { inStock, ...item } = product;
    void inStock;
    const viewCart = { label: "View cart", onClick: () => router.push(storeRoutes.cart) };
    const result = addProductToCart(item, quantity);

    if (result === "full") {
      const message = `Your cart can hold up to ${MAX_CART_ITEMS} items. Place your order or remove one to add another.`;
      toast.error(message, { action: viewCart });
      setAnnouncement(message);
      return false;
    }
    if (result === "invalid") {
      const message = "We couldn’t add this product. Please refresh the page and try again.";
      toast.error(message);
      setAnnouncement(message);
      return false;
    }

    const message = `${quantity > 1 ? `${quantity} × ` : ""}${product.name} added to your cart`;
    toast.success(message, { action: viewCart });
    setAnnouncement(message);
    return true;
  };

  return { add, inCart, announcement };
}
