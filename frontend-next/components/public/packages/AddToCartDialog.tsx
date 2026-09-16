"use client";

import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import type { Package } from "@/lib/api/types";
import { MAX_CART_ITEMS, addToCart, isCartFull, useCart } from "@/lib/cart/store";
import { cn } from "@/lib/cn";
import { notify } from "@/lib/notify";
import { buttonBase, buttonHover } from "@/lib/publicStyles";

type Props = {
  product: Package | null;
  onClose: () => void;
};

/** "With / without solar" picker. Port of frontend/src/pages/Packages/AddToCartModal.jsx (MUI modal → kit Dialog). */
export default function AddToCartDialog({ product, onClose }: Props) {
  const cart = useCart();
  const [withSolar, setWithSolar] = useState<"true" | "false" | null>(null);

  const close = () => {
    setWithSolar(null);
    onClose();
  };

  function addProductToCart() {
    if (!product) return;
    if (isCartFull(cart)) {
      notify({
        type: "error",
        message: `Your cart can hold up to ${MAX_CART_ITEMS} items. Place your order or remove an item to add more.`,
      });
      return;
    }
    notify({ message: "Package added to cart" });

    const withSolarPrice = Number(product.options?.[1]?.price);
    const withoutSolarPrice = Number(product.options?.[0]?.price);

    addToCart({
      ...product,
      withSolarPrice,
      withoutSolarPrice,
      price: withSolar === "true" ? withSolarPrice : withoutSolarPrice,
      package: withSolar === "true" ? product.options?.[1]?.kits : product.options?.[0]?.kits,
      withSolar,
    });
    close();
  }

  const choice = (value: "true" | "false", label: string) => (
    <label className="flex min-h-[48px] cursor-pointer items-center justify-between py-2 md:mb-3 last:mb-0">
      <span className="inter-regular flex-1 text-base">{label}</span>
      <input
        type="radio"
        name="withSolar"
        value={value}
        checked={withSolar === value}
        onChange={() => setWithSolar(value)}
        className="mr-2 h-5 w-5 cursor-pointer accent-brand-500 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      />
    </label>
  );

  return (
    <Dialog
      open={Boolean(product)}
      onClose={close}
      title={
        <span className="inter-bold flex items-center gap-3 text-lg">
          <ShoppingCart aria-hidden="true" className="h-6 w-6" />
          Add To Cart
        </span>
      }
      className="max-w-[550px]"
    >
      <fieldset>
        <legend className="inter-regular text-base text-[#0B0B0B]">Packages Options</legend>
        <div className="mt-4 rounded-lg border-2 border-dashed px-3 py-3">
          {choice("true", "With Solar")}
          {choice("false", "Without Solar")}
        </div>
      </fieldset>

      <button
        type="button"
        disabled={withSolar === null}
        onClick={addProductToCart}
        className={cn(buttonBase, buttonHover, "mt-5 w-full bg-brand-500 text-white")}
      >
        Continue
      </button>
    </Dialog>
  );
}
