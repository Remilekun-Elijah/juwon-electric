import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/catalog";

export type PriceTagProps = {
  /** Naira amount (numbers or numeric strings). Non-numeric values render "Price on request". */
  amount: number | string | null | undefined;
  /** Small label before the price, e.g. "From". */
  prefix?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-2xl sm:text-3xl",
};

/** "₦1,150,000" in tabular figures, with an optional "From" label. Server component. */
export default function PriceTag({ amount, prefix, size = "md", className }: PriceTagProps) {
  const value = typeof amount === "string" ? Number(amount.replace(/[^\d.]/g, "")) : Number(amount);
  const valid = amount !== null && amount !== undefined && amount !== "" && Number.isFinite(value) && value > 0;

  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-1.5", className)}>
      {prefix && valid && <span className="text-sm font-medium text-slate-500">{prefix}</span>}
      {valid ? (
        <span className={cn("font-semibold tabular-nums tracking-tight text-slate-900", sizes[size])}>{formatPrice(value)}</span>
      ) : (
        <span className="text-sm font-medium text-slate-500">Price on request</span>
      )}
    </span>
  );
}
