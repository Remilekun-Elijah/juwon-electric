"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BatteryCharging, Package as PackageIcon, Sun, Zap } from "lucide-react";
import {
  availablePackages,
  hasSolarOption,
  includedProducts,
  lowestPrice,
  packageCategoryKey,
  categorisedPackages,
  packageCategoryOptions,
} from "@/components/storefront/catalog/packageMeta";
import PriceTag from "@/components/storefront/PriceTag";
import HorizontalScrollList from "@/components/storefront/motion/HorizontalScrollList";
import { Badge, TabPanel, Tabs, buttonClasses } from "@/components/ui";
import type { Package } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { packagePath } from "@/lib/packages";
import { storeRoutes } from "@/lib/storefront/routes";
import { storeArrowNudge, storeCard, storeFocus, storeHoverLift, storePress } from "@/lib/storefront/styles";

/** Packages per tab: three fit on desktop and the rest slide in sideways as the page scrolls (HorizontalScrollList). */
const PER_TAB = 6;

/**
 * Up to `count` packages for a category, spread evenly from the cheapest to the most premium: all of them when there are
 * `count` or fewer, otherwise the cheapest, the most expensive and evenly spaced ones in between.
 */
export function pickRange(packages: Package[], count = PER_TAB): Package[] {
  const sorted = [...packages].sort((a, b) => (lowestPrice(a) || Infinity) - (lowestPrice(b) || Infinity));
  if (sorted.length <= count) return sorted;
  if (count <= 1) return sorted.slice(0, count);
  return Array.from({ length: count }, (_, index) => sorted[Math.round((index * (sorted.length - 1)) / (count - 1))]);
}

/** Tab icons, reused in order: there are as many tabs as the packages have catalogue categories. */
const tabIcons = [BatteryCharging, Zap, Sun];

function FinderCard({ pkg }: { pkg: Package }) {
  const price = lowestPrice(pkg);
  const included = includedProducts(pkg, 3);
  return (
    <article className={cn(storeCard, storeHoverLift, "group relative flex h-full flex-col p-5 sm:p-6")}>
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <PackageIcon aria-hidden="true" className="h-5 w-5" />
        </span>
        {hasSolarOption(pkg) && (
          <Badge tone="neutral">
            <Sun aria-hidden="true" className="h-3.5 w-3.5" />
            Solar option
          </Badge>
        )}
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-900">
        <Link href={packagePath(pkg)} className={cn("rounded-sm after:absolute after:inset-0 after:rounded-2xl after:content-['']", storeFocus)}>
          {pkg.name} {pkg.kva}kVA
        </Link>
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        {[pkg.volt ? `${pkg.volt}V` : null, pkg.type ? `${pkg.type} battery` : null]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {included.items.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">What’s included</p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
            {included.items.map((item) => (
              <li key={item.productId} className="flex gap-2">
                <span className="w-7 shrink-0 font-semibold tabular-nums text-slate-500">
                  {item.quantity}
                  <span aria-hidden="true">&times;</span>
                  <span className="sr-only"> of</span>
                </span>
                <span className="min-w-0 break-words">{item.name}</span>
              </li>
            ))}
          </ul>
          {included.more > 0 && <p className="mt-1.5 pl-9 text-sm text-slate-500">and {included.more} more</p>}
        </div>
      )}
      {pkg.load && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">What it powers</p>
          <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-slate-600">{pkg.load}</p>
        </div>
      )}
      <div className="mt-auto flex items-end justify-between gap-3 pt-5">
        <PriceTag amount={price} prefix="From" size="md" />
        <ArrowRight aria-hidden="true" className={cn("mb-1 h-5 w-5 shrink-0 text-slate-400 group-hover:text-brand-700", storeArrowNudge)} />
      </div>
    </article>
  );
}

/**
 * "Find your package": tabs by catalogue category (Commerce v3 §4), each showing up to six packages from cheapest to
 * premium, in a row that slides sideways as the visitor scrolls: scrolling down brings the other packages in from the
 * right, scrolling up takes them back out (HorizontalScrollList). The tabs are the categories these packages carry, with the ones that have no category under "Other".
 * Packages with no available option are left out (Commerce v2 §4).
 */
export default function PackageFinder({ packages: allPackages }: { packages: Package[] }) {
  const packages = categorisedPackages(availablePackages(allPackages));
  const groups = packageCategoryOptions(packages).map((option) => ({
    value: option.value,
    label: option.label,
    packages: packages.filter((pkg) => packageCategoryKey(pkg) === option.value),
  }));

  const [active, setActive] = useState(groups[0]?.value ?? "");
  const current = groups.find((group) => group.value === active) ?? groups[0];
  if (!current) return null;

  return (
    <div>
      <Tabs
        id="package-finder"
        aria-label="Package category"
        value={current.value}
        onChange={setActive}
        withPanels
        items={groups.map((group, index) => ({
          value: group.value,
          label: group.label,
          icon: tabIcons[index % tabIcons.length],
          count: group.packages.length,
        }))}
      />
      {groups.map((group) => (
        <TabPanel key={group.value} id="package-finder" value={group.value} active={group.value === current.value} className="mt-6">
          <HorizontalScrollList aria-label={`${group.label} packages`}>
            {pickRange(group.packages).map((pkg) => (
              <li key={String(pkg.id)} className="min-w-0">
                <FinderCard pkg={pkg} />
              </li>
            ))}
          </HorizontalScrollList>
          <div className="mt-6">
            <Link
              href={`${storeRoutes.packages}?category=${encodeURIComponent(group.value)}`}
              className={buttonClasses({ variant: "outline", size: "lg", className: cn("w-full sm:w-auto", storePress) })}
            >
              {/* Category names are free text from the admin ("Inverters"), so they read as "… packages in <name>". */}
              {group.packages.length === 1 ? "See all 1 package" : `See all ${group.packages.length} packages`}
              {` in ${group.label}`}
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </TabPanel>
      ))}
    </div>
  );
}
