import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { getStatusMeta } from "./statusMaps";

const tones = {
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
  brand: "border-brand-200 bg-brand-50 text-brand-700",
  success: "border-green-200 bg-green-50 text-green-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-red-200 bg-red-50 text-red-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
};

export type BadgeTone = keyof typeof tones;

type BadgeProps = Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  tone?: BadgeTone | string;
  variant?: BadgeTone | string;
  dot?: boolean;
  children?: ReactNode;
};

const isTone = (value: string | undefined): value is BadgeTone => Boolean(value && value in tones);

/**
 * Badge / pill. Props: tone (neutral|brand|success|warning|danger|info; `variant` is accepted as an alias),
 * dot (leading current-color dot), className, children.
 */
export function Badge({ tone, variant, dot = false, className, children, ...props }: BadgeProps) {
  const requested = tone ?? variant;
  const resolved: BadgeTone = isTone(requested) ? requested : "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[resolved],
        className
      )}
      {...props}
    >
      {dot && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

type StatusBadgeProps = Omit<BadgeProps, "tone" | "variant" | "children"> & {
  type: string;
  status?: string | boolean | null;
  label?: ReactNode;
};

/**
 * StatusBadge. Props: type ("order"|"payment"|"contact"|"newsletter"|"catalog"), status (string or boolean for
 * newsletter/catalog isActive; empty uses the type's default), label (override), dot, className.
 */
export function StatusBadge({ type, status, label, dot = false, className, ...props }: StatusBadgeProps) {
  const meta = getStatusMeta(type, status);
  return (
    <Badge tone={meta.tone} dot={dot} className={className} {...props}>
      {label ?? meta.label}
    </Badge>
  );
}

export default Badge;
