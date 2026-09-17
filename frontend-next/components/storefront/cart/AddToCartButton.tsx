"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ShoppingCart } from "lucide-react";
import { Button, buttonClasses, toast } from "@/components/ui";
import type { Package } from "@/lib/api/types";
import { MAX_CART_ITEMS, addToCart, getCartItemKey, isCartFull, useCart } from "@/lib/cart/store";
import { cn } from "@/lib/cn";
import { storeRoutes } from "@/lib/storefront/routes";

export type AddToCartButtonProps = {
  pkg: Package;
  /** Index into `pkg.options`: 0 = without solar, 1 = with solar (the classic cart only knows these two). */
  optionIndex?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
};

/**
 * Adds a package with the chosen option to the shared cart, in the exact classic shape
 * (components/public/packages/AddToCartDialog.tsx), so carts work across the classic site and the storefront.
 * A package already in the cart shows "In cart" and links to it (cart lines are keyed per package, not per option).
 *
 * Minimal version from S0; S2 owns and finishes it. The props are a shared contract with S1.
 */
export default function AddToCartButton({ pkg, optionIndex = 0, className, size = "md" }: AddToCartButtonProps) {
  const router = useRouter();
  const cart = useCart();
  const inCart = cart.some((line) => getCartItemKey(line) === getCartItemKey(pkg));
  const withSolar = optionIndex === 1 ? ("true" as const) : ("false" as const);
  const option = pkg.options?.[withSolar === "true" ? 1 : 0];
  const unavailable = !option || !(Number(option.price) > 0);

  if (inCart) {
    return (
      <Link href={storeRoutes.cart} className={buttonClasses({ variant: "outline", size, className: cn("gap-2", className) })}>
        <CheckCircle2 aria-hidden="true" className="text-green-600" />
        In cart
      </Link>
    );
  }

  const add = () => {
    if (unavailable) return;
    if (isCartFull(cart)) {
      toast.error(`Your cart can hold up to ${MAX_CART_ITEMS} packages. Place your order or remove one to add another.`, {
        action: { label: "View cart", onClick: () => router.push(storeRoutes.cart) },
      });
      return;
    }

    const withSolarPrice = Number(pkg.options?.[1]?.price);
    const withoutSolarPrice = Number(pkg.options?.[0]?.price);

    addToCart({
      ...pkg,
      withSolarPrice,
      withoutSolarPrice,
      price: withSolar === "true" ? withSolarPrice : withoutSolarPrice,
      package: withSolar === "true" ? pkg.options?.[1]?.kits : pkg.options?.[0]?.kits,
      withSolar,
    });

    toast.success(`${pkg.name} ${pkg.kva}kVA added to your cart`, {
      action: { label: "View cart", onClick: () => router.push(storeRoutes.cart) },
    });
  };

  return (
    <Button
      size={size}
      className={className}
      disabled={unavailable}
      onClick={add}
      icon={<ShoppingCart aria-hidden="true" />}
    >
      {unavailable ? "Unavailable" : "Add to cart"}
    </Button>
  );
}
