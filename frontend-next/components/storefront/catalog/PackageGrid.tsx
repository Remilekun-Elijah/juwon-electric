import Reveal from "@/components/storefront/motion/Reveal";
import type { Package } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { staggerDelay } from "@/lib/storefront/styles";
import PackageCard from "./PackageCard";
import { packageKey } from "./packageMeta";

export type PackageGridProps = {
  packages: Package[];
  headingAs?: "h2" | "h3";
  compact?: boolean;
  showCategory?: boolean;
  /**
   * Page-load entrance for grids near the top of a page: cards rise in 60ms apart as the page opens (CSS, so visible
   * cards animate even before hydration). Cards further down still reveal as they scroll into view.
   */
  enter?: boolean;
  /** Extra delay (ms) before the first card's entrance, to follow the page intro. */
  enterDelay?: number;
  className?: string;
};

/** Responsive grid of package cards (1 column, 2 from md, 3 from lg) that reveal in a stagger. Server and client safe. */
export default function PackageGrid({
  packages,
  headingAs = "h3",
  compact = false,
  showCategory = true,
  enter = false,
  enterDelay = 0,
  className,
}: PackageGridProps) {
  return (
    <Reveal as="ul" stagger className={cn("grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3", className)}>
      {packages.map((pkg, index) => (
        <li key={packageKey(pkg)} className={enter ? "je-in" : undefined} style={enter ? staggerDelay(index, 60, enterDelay, 6) : undefined}>
          <PackageCard pkg={pkg} headingAs={headingAs} compact={compact} showCategory={showCategory} />
        </li>
      ))}
    </Reveal>
  );
}
