"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import type { Package } from "@/lib/api/types";
import { getCartItemKey, useCart } from "@/lib/cart/store";
import { cn } from "@/lib/cn";
import { getAmount } from "@/lib/format";
import { packageHighlight, packagePath } from "@/lib/packages";
import { cardTitle } from "@/lib/publicStyles";

type Props = {
  item: Package;
  onAdd: (item: Package) => void;
  /** Hide the "View details" link (on the detail page itself). */
  detail?: boolean;
  headingLevel?: "h2" | "h3";
};

/** One package card. Port of frontend/src/pages/Packages/DisplayProduct.jsx. */
export default function PackageCard({ item, onAdd, detail = false, headingLevel: Heading = "h3" }: Props) {
  const cart = useCart();
  const inCart = cart.some((line) => getCartItemKey(line) === getCartItemKey(item));
  const highlight = packageHighlight(item);
  const gradient = highlight === "gradient";
  const diamond = highlight === "diamond";
  const light = gradient || diamond;

  return (
    <article
      className={cn(
        "flex flex-col rounded-xl px-5 py-5 shadow-sm md:px-3",
        gradient ? "bg-linear-to-b from-brand-500 to-pink-400" : diamond ? "bg-linear-to-b from-[#ff6961] to-[#ff9f00]" : "bg-white"
      )}
    >
      <Heading className={cn(cardTitle, "mb-4 mt-2 text-center", light ? "text-white" : "text-black")}>{item.name}</Heading>

      <p className={cn("inter-medium mb-5 text-center text-sm md:text-base", light ? "text-white" : "text-[#e26767] md:text-[#EDA4A6]")}>
        {item.load}
      </p>

      <p className="mb-3 flex items-center justify-center gap-2 text-center">
        <span className="inline-flex">
          <strong className={cn("inter-semibold m-0 p-0 text-4xl drop-shadow-md md:text-[50px]", light ? "text-white" : "text-black")}>
            {item.kva}
          </strong>
          <sup className={cn("inter-medium ml-1 mt-2 p-0 text-lg drop-shadow-md", light ? "text-white" : "text-[#EDA4A6]")}>kva</sup>
        </span>
        {item.volt && (
          <span className="inline-flex">
            <strong className={cn("inter-semibold m-0 p-0 text-4xl drop-shadow-md md:text-[50px]", light ? "text-white" : "text-black")}>
              {item.volt}
            </strong>
            <sup className={cn("inter-medium ml-1 mt-2 p-0 text-lg drop-shadow-md", light ? "text-white" : "text-[#EDA4A6]")}>v</sup>
          </span>
        )}
      </p>

      {/* flex-1 options panel + mt-auto button: panels and buttons line up across a row. */}
      <div className={cn("flex flex-1 flex-col rounded-xl px-5 py-7", light ? "bg-white" : "bg-[#F9FAFB]")}>
        <ul>
          {item.options.map((option, i) => (
            <li key={i} className="mb-5 flex gap-3">
              <Check
                aria-hidden="true"
                className={cn("h-6 w-6 shrink-0 rounded-full p-1 text-white", diamond ? "bg-[var(--diamond)]" : "bg-brand-500")}
                strokeWidth={3}
              />
              <div>
                <p className="inter-medium text-sm md:text-base">
                  {option.name},{" "}
                  <span className={diamond ? "text-[var(--diamond)]" : "text-brand-500"}>₦{getAmount(option.price)}</span>
                </p>
                <p className="inter-medium text-sm md:text-base">({option.kits})</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex flex-col items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => onAdd(item)}
            disabled={inCart}
            className={cn(
              "inter-semibold min-h-[52px] rounded-lg px-10 py-3 text-base text-brand-500 transition-colors duration-150 hover:text-white focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed",
              inCart && diamond
                ? "bg-[#edbe71] text-white"
                : inCart
                  ? "bg-[#EDA4A6] text-white"
                  : gradient
                    ? "bg-linear-to-r from-brand-500 to-pink-500 text-white"
                    : diamond
                      ? "bg-linear-to-r from-[#ff9f00] to-[#ff6961] text-white"
                      : "bg-white shadow-lg hover:bg-brand-500"
            )}
          >
            {inCart ? "In Cart" : "Add To Cart"}
            <span className="sr-only">: {item.name} {item.kva}kva</span>
          </button>
          {!detail && (
            <Link
              href={packagePath(item)}
              className="inter-medium rounded-sm text-sm text-faint underline-offset-4 hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              View details<span className="sr-only">: {item.name} {item.kva}kva {item.type}</span>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
