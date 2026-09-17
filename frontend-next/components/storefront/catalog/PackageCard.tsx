import Link from "next/link";
import { ArrowRight, Package as PackageIcon, Sun, Zap } from "lucide-react";
import { Badge, buttonClasses } from "@/components/ui";
import AddToCartButton from "@/components/storefront/cart/AddToCartButton";
import PriceTag from "@/components/storefront/PriceTag";
import type { Package } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { packagePath } from "@/lib/packages";
import { storeCard, storeFocus } from "@/lib/storefront/styles";
import { defaultCartOptionIndex, hasSolarOption, includedProductCount, lowestPrice, packageRating, packageTypeLabel } from "./packageMeta";

export type PackageCardProps = {
  pkg: Package;
  /** Heading level for the package name (h2 on a page whose sections have no h2 above the grid). */
  headingAs?: "h2" | "h3";
  /** Smaller card without the load text and cart button, for "Included in these packages" and related lists. */
  compact?: boolean;
  className?: string;
};

/**
 * Package summary card: type, kVA and volt, what it powers, "from" price, solar availability, included items count,
 * "View details" and add to cart. Prices and the solar badge only count available options (Commerce v2 §4). No "use client": it renders inside the server pages and the PackageFilters island.
 */
export default function PackageCard({ pkg, headingAs: Heading = "h3", compact = false, className }: PackageCardProps) {
  const productCount = includedProductCount(pkg);
  const solar = hasSolarOption(pkg);
  const label = `${pkg.name} ${pkg.kva}kVA ${packageTypeLabel(pkg).toLowerCase()}`;

  return (
    <article className={cn(storeCard, "flex h-full flex-col", compact ? "p-4 sm:p-5" : "p-5 sm:p-6", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">{packageTypeLabel(pkg)}</Badge>
        {solar && (
          <Badge tone="warning" className="gap-1">
            <Sun aria-hidden="true" className="h-3.5 w-3.5" />
            Solar option
          </Badge>
        )}
      </div>

      <Heading className={cn("mt-4 font-semibold tracking-tight text-slate-900", compact ? "text-base" : "text-lg")}>
        <Link href={packagePath(pkg)} className={cn("rounded-sm transition-colors hover:text-brand-700", storeFocus)}>
          {pkg.name}
        </Link>
      </Heading>
      <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 tabular-nums">
        <Zap aria-hidden="true" className="h-4 w-4 text-brand-700" />
        {packageRating(pkg)}
      </p>

      {!compact && pkg.load && (
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">
          <span className="font-medium text-slate-700">Powers </span>
          {pkg.load}
        </p>
      )}

      {productCount > 0 && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-slate-500">
          <PackageIcon aria-hidden="true" className="h-4 w-4 text-slate-400" />
          Includes {productCount} {productCount === 1 ? "product" : "products"}
        </p>
      )}

      <div className={cn("mt-auto", compact ? "pt-4" : "pt-5")}>
        <div className="border-t border-slate-100 pt-4">
          <PriceTag amount={lowestPrice(pkg)} prefix="From" size={compact ? "sm" : "md"} />
        </div>
        <div className={cn("mt-4 flex flex-col gap-2", !compact && "sm:flex-row md:flex-col xl:flex-row")}>
          <Link
            href={packagePath(pkg)}
            className={buttonClasses({ variant: "outline", size: "lg", className: cn("w-full", !compact && "sm:flex-1 md:flex-none xl:flex-1") })}
          >
            View details
            <span className="sr-only">: {label}</span>
            <ArrowRight aria-hidden="true" />
          </Link>
          {!compact && <AddToCartButton pkg={pkg} optionIndex={defaultCartOptionIndex(pkg)} size="lg" className="w-full sm:flex-1 md:flex-none xl:flex-1" />}
        </div>
      </div>
    </article>
  );
}
