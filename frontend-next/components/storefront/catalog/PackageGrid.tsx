import Reveal from "@/components/storefront/motion/Reveal";
import type { Package } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import PackageCard from "./PackageCard";
import { packageKey } from "./packageMeta";

export type PackageGridProps = {
  packages: Package[];
  headingAs?: "h2" | "h3";
  compact?: boolean;
  showCategory?: boolean;
  className?: string;
};

/** Responsive grid of package cards (1 column, 2 from md, 3 from lg) that reveal in a stagger. Server and client safe. */
export default function PackageGrid({ packages, headingAs = "h3", compact = false, showCategory = true, className }: PackageGridProps) {
  return (
    <Reveal as="ul" stagger className={cn("grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3", className)}>
      {packages.map((pkg) => (
        <li key={packageKey(pkg)}>
          <PackageCard pkg={pkg} headingAs={headingAs} compact={compact} showCategory={showCategory} />
        </li>
      ))}
    </Reveal>
  );
}
