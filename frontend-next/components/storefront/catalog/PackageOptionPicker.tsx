"use client";

import { useId, useState } from "react";
import { Sun, Zap } from "lucide-react";
import AddToCartButton from "@/components/storefront/cart/AddToCartButton";
import PriceTag from "@/components/storefront/PriceTag";
import type { Package } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import OptionStockHint from "./OptionStockHint";
import { usePackageOptionScope } from "./PackageOptionScope";
import { cartOptions, defaultCartOptionIndex } from "./packageMeta";

/**
 * Option radio group (without or with solar, with prices). Only available options are listed (Commerce v2 §4), and
 * each keeps its ORIGINAL index into `pkg.options`, which is what AddToCartButton receives. Inside a
 * PackageOptionScope the choice also switches the page's "What's included" panels.
 */
export default function PackageOptionPicker({ pkg }: { pkg: Package }) {
  const baseId = useId();
  const scope = usePackageOptionScope();
  const [localSelected, setLocalSelected] = useState(() => defaultCartOptionIndex(pkg));
  const selected = scope ? scope.selected : localSelected;
  const select = scope ? scope.select : setLocalSelected;

  const options = cartOptions(pkg);
  const chosen = options.find((option) => option.index === selected) ?? options[0];

  if (!options.length) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Prices for this package are being updated. Contact us for a quote.
      </p>
    );
  }

  return (
    <div>
      <fieldset>
        <legend className="text-sm font-semibold text-slate-900">Choose an option</legend>
        <div className="mt-3 grid gap-3">
          {options.map((option) => {
            const id = `${baseId}-option-${option.index}`;
            const checked = chosen?.index === option.index;
            const Icon = option.index === 1 ? Sun : Zap;
            return (
              <label
                key={option.index}
                htmlFor={id}
                className={cn(
                  "relative flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 has-[:focus-visible]:ring-offset-2",
                  checked ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-white hover:bg-slate-50"
                )}
              >
                <input
                  id={id}
                  type="radio"
                  name={`${baseId}-option`}
                  value={option.index}
                  checked={checked}
                  onChange={() => select(option.index)}
                  className="h-4 w-4 shrink-0 accent-brand-600 focus-visible:outline-hidden"
                />
                <Icon aria-hidden="true" className={cn("h-5 w-5 shrink-0", checked ? "text-brand-700" : "text-slate-400")} />
                <span className="min-w-0 flex-1 text-sm font-medium text-slate-900">{option.name}</span>
                <PriceTag amount={option.amount} size="sm" />
              </label>
            );
          })}
        </div>
      </fieldset>

      {chosen && (
        <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-500" aria-live="polite">
          <span className="font-medium text-slate-900">{chosen.name}:</span>
          <OptionStockHint inStock={chosen.inStock} />
          {chosen.inStock === false && <span>We’ll confirm a delivery date when we call.</span>}
        </p>
      )}

      <div className="mt-5">
        <AddToCartButton pkg={pkg} optionIndex={chosen?.index ?? 0} size="lg" className="w-full" />
      </div>
    </div>
  );
}
