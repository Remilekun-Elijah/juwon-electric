"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { storeFocus } from "@/lib/storefront/styles";

/** A number that rolls up into a clipped cell when it changes: the keyed span remounts and replays `je-roll`. */
export function RollingDigits({ value }: { value: number }) {
  return (
    <span className="inline-block overflow-hidden">
      <span key={value} className="je-roll inline-block">
        {value}
      </span>
    </span>
  );
}

export type QuantityStepperProps = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** Accessible group name, e.g. "Quantity for Felicity 200Ah battery". */
  label: string;
  disabled?: boolean;
  /** Id of a hint shown when the maximum is reached. */
  maxHintId?: string;
  className?: string;
};

const stepButton = cn(
  "grid h-11 w-11 place-items-center text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent",
  storeFocus,
  "focus-visible:ring-offset-0"
);

/**
 * Minus, value and plus with 44 px targets, in the cart line style. The value is announced politely. A new value rolls up
 * into its cell (180ms, TEAM_AND_MOTION_V1 §8.2; none under reduced motion).
 */
export default function QuantityStepper({ value, min, max, onChange, label, disabled = false, maxHintId, className }: QuantityStepperProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs", className)}
    >
      <button
        type="button"
        className={cn(stepButton, "rounded-l-lg")}
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Decrease quantity"
      >
        <Minus aria-hidden="true" className="h-4 w-4" />
      </button>
      <output
        aria-live="polite"
        className="grid h-11 min-w-12 place-items-center border-x border-slate-200 px-2 text-sm font-semibold tabular-nums text-slate-900"
      >
        <span className="sr-only">Quantity </span>
        <RollingDigits value={value} />
      </output>
      <button
        type="button"
        className={cn(stepButton, "rounded-r-lg")}
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="Increase quantity"
        aria-describedby={value >= max ? maxHintId : undefined}
      >
        <Plus aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}
