import { cn } from "@/lib/cn";

/** Container. Public site max-width wrapper (replaces MUI Container). Props: as (default "div"), className, children. */
export function Container({ as: Comp = "div", className, ...props }) {
  return <Comp className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)} {...props} />;
}

export default Container;
