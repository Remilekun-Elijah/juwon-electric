import { cn } from "@/lib/cn";

export type SampleBadgeProps = {
  /** Renders nothing unless true, so callers can pass `item.sample` straight through. */
  show?: boolean;
  /** `brand` for use on the brand panel. */
  tone?: "light" | "brand";
  className?: string;
};

/**
 * Small neutral "Sample" pill for seeded website content (LANDING_V1 §0). The title explains it to hover and
 * screen-reader users. Server component.
 */
export default function SampleBadge({ show = true, tone = "light", className }: SampleBadgeProps) {
  if (!show) return null;
  return (
    <span
      title="Sample content, to be replaced before launch"
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase leading-4 tracking-[0.08em]",
        tone === "brand" ? "bg-white/10 text-white ring-1 ring-white/20 ring-inset" : "bg-slate-100 text-slate-600 ring-1 ring-slate-200 ring-inset",
        className
      )}
    >
      Sample
      <span className="sr-only"> content</span>
    </span>
  );
}
