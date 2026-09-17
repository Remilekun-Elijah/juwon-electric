import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BrandPanelProps = {
  /** Element to render (default `div`; use `section` or `aside` for landmarks and label them). */
  as?: ElementType;
  /** Ring position: top right (default) or bottom left. */
  ring?: "top-right" | "bottom-left" | "none";
  className?: string;
  children?: ReactNode;
  id?: string;
  "aria-labelledby"?: string;
  "aria-label"?: string;
};

/**
 * Brand feature panel copied from the admin login: `bg-brand-800`, white text, a soft decorative ring.
 * Rounded card by default; pass `rounded-none` for a full-bleed band. Server component.
 */
export default function BrandPanel({ as: Component = "div", ring = "top-right", className, children, ...rest }: BrandPanelProps) {
  return (
    <Component className={cn("relative isolate overflow-hidden rounded-2xl bg-brand-800 text-white", className)} {...rest}>
      {ring !== "none" && (
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute -z-10 h-[420px] w-[420px] rounded-full border-[48px] border-white/5",
            ring === "top-right" ? "-right-40 -top-40" : "-bottom-40 -left-40"
          )}
        />
      )}
      {children}
    </Component>
  );
}
