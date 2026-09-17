"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/cn";

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Accessible name, for example "Quantity of 5kVA inverter". */
  label: string;
  /** `lg` gives 44 px touch targets (in-store sale on phones). */
  size?: "md" | "lg";
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Whole-number stepper: − and + buttons around a numeric input. Typed values are clamped on blur. */
export function QuantityStepper({ value, onChange, min = 1, max = 1000, label, size = "md", disabled, invalid, className }: Props) {
  const [text, setText] = useState(String(value));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setText(String(value));
  }

  const commit = (raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    const next = Number.isNaN(parsed) ? value : clamp(parsed, min, max);
    setText(String(next));
    if (next !== value) onChange(next);
  };

  const buttonSize = size === "lg" ? "h-11 w-11" : "h-10 w-10";

  return (
    <div role="group" aria-label={label} className={cn("inline-flex items-center gap-1", className)}>
      <Button
        variant="outline"
        size="icon"
        className={buttonSize}
        aria-label="Decrease quantity"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - 1, min, max))}
      >
        <Minus aria-hidden="true" />
      </Button>
      <Input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        size={size}
        aria-label="Quantity"
        invalid={invalid}
        disabled={disabled}
        className="w-16 px-2 text-center tabular-nums"
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          const parsed = Number.parseInt(event.target.value, 10);
          if (!Number.isNaN(parsed) && parsed >= min && parsed <= max) onChange(parsed);
        }}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(event.currentTarget.value);
          }
        }}
      />
      <Button
        variant="outline"
        size="icon"
        className={buttonSize}
        aria-label="Increase quantity"
        disabled={disabled || value >= max}
        onClick={() => onChange(clamp(value + 1, min, max))}
      >
        <Plus aria-hidden="true" />
      </Button>
    </div>
  );
}
