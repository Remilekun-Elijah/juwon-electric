"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BatteryCharging, Package as PackageIcon, Sun, Zap } from "lucide-react";
import PriceTag from "@/components/storefront/PriceTag";
import { Badge, TabPanel, Tabs, buttonClasses } from "@/components/ui";
import type { Package } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { PACKAGE_TABS, packagePath, packageTabIndex } from "@/lib/packages";
import { storeRoutes } from "@/lib/storefront/routes";
import { storeCard, storeFocus } from "@/lib/storefront/styles";

/** Lowest positive option price, or 0 when none is priced. */
export const lowestPrice = (pkg: Package) => {
  const prices = (pkg.options ?? []).map((option) => Number(option.price)).filter((price) => Number.isFinite(price) && price > 0);
  return prices.length ? Math.min(...prices) : 0;
};

/**
 * Up to three packages for a type, spread from the cheapest to the most premium: all of them when there are three or
 * fewer, otherwise the cheapest, the middle and the most expensive.
 */
export function pickRange(packages: Package[]): Package[] {
  const sorted = [...packages].sort((a, b) => (lowestPrice(a) || Infinity) - (lowestPrice(b) || Infinity));
  if (sorted.length <= 3) return sorted;
  return [sorted[0], sorted[Math.floor((sorted.length - 1) / 2)], sorted[sorted.length - 1]];
}

const tabIcons = [BatteryCharging, Zap, Sun];

/** `/packages?type=` values for each tab (the S1 packages page filter). */
const typeQuery = ["tubular", "lithium", "hybrid-lithium"];

const hasSolarOption = (pkg: Package) => Number(pkg.options?.[1]?.price) > 0;

function FinderCard({ pkg }: { pkg: Package }) {
  const price = lowestPrice(pkg);
  const items = pkg.items?.length ?? 0;
  return (
    <article className={cn(storeCard, "group relative flex h-full flex-col p-5 transition-shadow hover:shadow-elev-3 sm:p-6")}>
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
        {[pkg.volt ? `${pkg.volt}V` : null, pkg.type ? `${pkg.type} battery` : null, items ? `${items} items included` : null]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {pkg.load && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{pkg.load}</p>}
      <div className="mt-auto flex items-end justify-between gap-3 pt-5">
        <PriceTag amount={price} prefix="From" size="md" />
        <ArrowRight aria-hidden="true" className="mb-1 h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:text-brand-700 motion-safe:group-hover:translate-x-0.5" />
      </div>
    </article>
  );
}

/** "Find your package": tabs by battery type, each showing up to three packages from cheapest to premium. */
export default function PackageFinder({ packages }: { packages: Package[] }) {
  const groups = PACKAGE_TABS.map((label, index) => ({
    value: String(index),
    label,
    packages: packages.filter((pkg) => packageTabIndex(pkg) === index),
  })).filter((group) => group.packages.length > 0);

  const [active, setActive] = useState(groups[0]?.value ?? "0");
  const current = groups.find((group) => group.value === active) ?? groups[0];
  if (!current) return null;

  return (
    <div>
      <Tabs
        id="package-finder"
        aria-label="Package type"
        value={current.value}
        onChange={setActive}
        withPanels
        items={groups.map((group) => ({
          value: group.value,
          label: group.label,
          icon: tabIcons[Number(group.value)],
          count: group.packages.length,
        }))}
      />
      {groups.map((group) => (
        <TabPanel key={group.value} id="package-finder" value={group.value} active={group.value === current.value} className="mt-6">
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pickRange(group.packages).map((pkg) => (
              <li key={String(pkg.id)} className="min-w-0">
                <FinderCard pkg={pkg} />
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <Link href={`${storeRoutes.packages}?type=${typeQuery[Number(group.value)]}`} className={buttonClasses({ variant: "outline", size: "lg", className: "w-full sm:w-auto" })}>
              See all {group.packages.length} {group.label.toLowerCase()} packages
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </TabPanel>
      ))}
    </div>
  );
}
