import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Spinner. Props: variant ("inline" = 16px Loader2 | "ring" = 32px block ring), label (sr-only text), className.
 */
export function Spinner({ variant = "inline", label, className }) {
  const srLabel = label ? <span className="sr-only">{label}</span> : null;

  if (variant === "ring") {
    return (
      <span role={label ? "status" : undefined} className="inline-flex">
        <span
          aria-hidden="true"
          className={cn(
            "h-8 w-8 animate-spin rounded-full border-[3px] border-brand-100 border-t-brand-600",
            className
          )}
        />
        {srLabel}
      </span>
    );
  }

  return (
    <>
      <Loader2 aria-hidden="true" className={cn("h-4 w-4 animate-spin", className)} />
      {srLabel}
    </>
  );
}

export default Spinner;
