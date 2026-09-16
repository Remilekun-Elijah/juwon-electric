import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

/** Skeleton. Props: className (set size, e.g. "h-4 w-24"), ...div props. Neutral pulse block, aria-hidden. */
export function Skeleton({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-slate-200/70", className)} {...props} />;
}

export default Skeleton;
