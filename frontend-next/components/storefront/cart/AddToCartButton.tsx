"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, ShoppingCart } from "lucide-react";
import { Button, buttonClasses, toast } from "@/components/ui";
import type { Package } from "@/lib/api/types";
import { MAX_CART_ITEMS, addToCart, getCartItemKey, isCartFull, useCart } from "@/lib/cart/store";
import { cn } from "@/lib/cn";
import { storeRoutes } from "@/lib/storefront/routes";
import { useHydrated } from "@/lib/useHydrated";

export type AddToCartButtonProps = {
  pkg: Package;
  /** Index into `pkg.options`: 0 = without solar, 1 = with solar (the classic cart only knows these two). */
  optionIndex?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
};

/** Short name used in toasts and announcements: "Gold 5kVA". */
const packageTitle = (pkg: Package) => `${pkg.name} ${pkg.kva}kVA`;

/**
 * Adds a package with the chosen option to the shared cart, in the exact classic shape
 * (components/public/packages/AddToCartDialog.tsx), so carts work across the classic site and the storefront.
 *
 * States:
 * - before hydration the stored cart isn't known yet, so the button is disabled and marked busy;
 * - an option without a price is "Unavailable";
 * - a package already in the cart shows "In cart" and links to it (cart lines are keyed per package, not per option;
 *   switch with or without solar on the cart page);
 * - a full cart explains the limit in a toast instead of adding.
 * Adding shows a toast with a "View cart" action and is announced through a polite live region.
 *
 * The props are a shared contract with S1 (catalogue): keep them unchanged.
 */
export default function AddToCartButton({ pkg, optionIndex = 0, className, size = "md" }: AddToCartButtonProps) {
  const router = useRouter();
  const hydrated = useHydrated();
  const cart = useCart();
  const [announcement, setAnnouncement] = useState("");

  const inCart = cart.some((line) => getCartItemKey(line) === getCartItemKey(pkg));
  const withSolar = optionIndex === 1 ? ("true" as const) : ("false" as const);
  const option = pkg.options?.[withSolar === "true" ? 1 : 0];
  const unavailable = !option || !(Number(option.price) > 0);
  const title = packageTitle(pkg);

  const viewCart = { label: "View cart", onClick: () => router.push(storeRoutes.cart) };

  const add = () => {
    if (!hydrated || unavailable || inCart) return;
    if (isCartFull(cart)) {
      const message = `Your cart can hold up to ${MAX_CART_ITEMS} packages. Place your order or remove one to add another.`;
      toast.error(message, { action: viewCart });
      setAnnouncement(message);
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

    const message = `${title}${withSolar === "true" ? " with solar" : ""} added to your cart`;
    toast.success(message, { action: viewCart });
    setAnnouncement(message);
  };

  const liveRegion = (
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {announcement}
    </span>
  );

  if (hydrated && inCart) {
    return (
      <>
        <Link
          href={storeRoutes.cart}
          aria-label={`In cart: ${title}. View cart`}
          className={buttonClasses({ variant: "outline", size, className: cn("gap-2", size !== "lg" && "max-sm:h-11", className) })}
        >
          <CheckCircle2 aria-hidden="true" className="text-green-600" />
          In cart
        </Link>
        {liveRegion}
      </>
    );
  }

  return (
    <>
      <Button
        size={size}
        className={cn(size !== "lg" && "max-sm:h-11", className)}
        disabled={!hydrated || unavailable}
        aria-busy={!hydrated || undefined}
        aria-label={unavailable ? `Unavailable: ${title}` : `Add to cart: ${title}`}
        onClick={add}
        icon={<ShoppingCart aria-hidden="true" />}
      >
        {unavailable ? "Unavailable" : "Add to cart"}
      </Button>
      {liveRegion}
    </>
  );
}
