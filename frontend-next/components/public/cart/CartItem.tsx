"use client";

import Image from "next/image";
import { useState } from "react";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { cartItemBaseLabel } from "@/lib/cart/orderItems";
import { MAX_QUANTITY, getCartItemKey, isWithSolar, removeFromCart, updateCart, type CartItem as CartItemType } from "@/lib/cart/store";
import { cn } from "@/lib/cn";
import { getAmount } from "@/lib/format";
import { buttonHover, buttonSmall } from "@/lib/publicStyles";

// Quantity stepper button: 32px square, same look in both states.
const stepButton =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md p-0 shadow-sm transition-opacity duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#eee] disabled:text-brand-500";

const tierColour = (name: string) => {
  const tier = name.toLowerCase();
  if (tier === "platinum" || tier === "premium") return "text-[#e26767]";
  if (tier === "gold") return "text-[var(--gold)]";
  if (tier === "diamond") return "text-[var(--diamond)]";
  return "text-gray-500";
};

/** One cart row. Port of frontend/src/pages/Cart/CartItem.jsx (MUI Checkbox and modal → native checkbox and kit Dialog). */
export default function CartItem({ item }: { item: CartItemType }) {
  const [confirming, setConfirming] = useState(false);
  const cartKey = getCartItemKey(item);
  const label = cartItemBaseLabel(item);
  const solarId = `solar-${cartKey.replace(/[^a-zA-Z0-9]/g, "-")}`;

  return (
    <li className="mt-5 flex flex-col items-center justify-between gap-4 rounded-lg px-4 py-3 shadow-sm md:flex-row">
      <Image
        src="/cartImage.png"
        width={74}
        height={74}
        className="w-[50%] rounded-md p-1 md:w-fit md:shrink-0 md:shadow-sm"
        alt=""
      />
      {/* 450px preferred width, but allowed to shrink so the row never overflows (768/1024). */}
      <div className="md:min-w-0 md:shrink md:basis-[450px]">
        <p className="inter-semibold mb-0 pb-0 text-center text-base leading-snug md:text-left">{label}</p>
        <small className={tierColour(item.name)}>- {item.name} package</small>
      </div>

      <div className="grid w-full gap-5 px-2 md:flex-1 lg:min-w-[460px] lg:grid-cols-2">
        <div className="flex w-full justify-between gap-3 md:justify-around">
          <div className="inter-regular flex items-center gap-2 text-base">
            <input
              id={solarId}
              type="checkbox"
              checked={isWithSolar(item)}
              onChange={() => updateCart(cartKey, "panel")}
              className="h-[18px] w-[18px] cursor-pointer accent-brand-500 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            />
            <label htmlFor={solarId} className="inter-regular cursor-pointer whitespace-nowrap text-base">
              With solar
            </label>
          </div>
          <div className="inline-flex items-center justify-center gap-3" role="group" aria-label={`Quantity for ${label}`}>
            <button
              type="button"
              disabled={item.quantity === 1}
              onClick={() => updateCart(cartKey, "decrease")}
              aria-label="Decrease quantity"
              className={cn(stepButton, "bg-brand-500 text-white disabled:border-brand-500")}
            >
              <Minus aria-hidden="true" className="h-5 w-5" />
            </button>
            <p className="min-w-[1.5rem] text-center text-lg text-brand-500 drop-shadow-xl" aria-live="polite">
              <span className="sr-only">Quantity </span>
              {item.quantity}
            </p>
            <button
              type="button"
              disabled={item.quantity >= MAX_QUANTITY}
              title={item.quantity >= MAX_QUANTITY ? `You can order up to ${MAX_QUANTITY} of each package.` : undefined}
              onClick={() => updateCart(cartKey, "increase")}
              aria-label="Increase quantity"
              className={cn(stepButton, "bg-brand-500 text-white")}
            >
              <Plus aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-5 md:justify-around">
          <p className="inter-semibold ml-2 whitespace-nowrap text-brand-500 md:ml-0 md:min-w-[7.5rem] md:text-center md:text-black">
            ₦{getAmount(Number(item.price) * Number(item.quantity))}
          </p>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={cn(buttonSmall, buttonHover, "inter-medium cursor-pointer bg-brand-500 text-white")}
          >
            Remove<span className="sr-only"> {label}</span>
          </button>
        </div>
      </div>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        role="alertdialog"
        title={
          <span className="inter-bold flex items-center gap-3 text-lg">
            <ShoppingCart aria-hidden="true" className="h-6 w-6" />
            Remove item
          </span>
        }
        className="max-w-[550px]"
      >
        <div className="flex flex-col items-center justify-center px-5">
          <p className="inter-regular mb-5 block text-center text-base md:px-3">Are you sure you want to remove this item?</p>
          <div className="mb-5 flex flex-wrap justify-center gap-3 md:gap-10">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="min-h-[44px] rounded-lg border-2 border-brand-500 px-5 py-2 text-brand-500 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                removeFromCart(cartKey);
              }}
              className="min-h-[44px] rounded-lg border-0 bg-brand-500 px-5 py-2 text-white transition-opacity duration-150 hover:opacity-90 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Remove
            </button>
          </div>
        </div>
      </Dialog>
    </li>
  );
}
