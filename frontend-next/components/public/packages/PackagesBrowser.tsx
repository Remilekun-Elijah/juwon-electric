"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import type { Package } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { PACKAGE_TABS, packageTabIndex } from "@/lib/packages";
import AddToCartDialog from "./AddToCartDialog";
import PackageCard from "./PackageCard";

/**
 * Tabbed package grid with the add-to-cart dialog. Port of Packages.jsx + MiniTab.jsx + DisplayProduct.jsx.
 * Receives the (server-fetched or fallback) packages as props.
 */
export default function PackagesBrowser({ packages }: { packages: Package[] }) {
  const [active, setActive] = useState(0);
  const [product, setProduct] = useState<Package | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const visible = packages.filter((item) => packageTabIndex(item) === active);

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const last = PACKAGE_TABS.length - 1;
    const next =
      event.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : event.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : -1;
    if (next < 0) return;
    event.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <>
      <div className="my-10 flex justify-center">
        <div role="tablist" aria-label="Package type" className="inline-flex gap-2 rounded-md bg-white p-2">
          {PACKAGE_TABS.map((label, index) => (
            <button
              key={label}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`package-tab-${index}`}
              aria-controls="package-panel"
              aria-selected={active === index}
              tabIndex={active === index ? 0 : -1}
              onClick={() => setActive(index)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "inter-medium min-h-[40px] cursor-pointer rounded-md px-3 py-2 uppercase leading-6 transition-shadow duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
                active === index ? "bg-brand-500 text-white shadow-lg" : "bg-white text-black"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div
        id="package-panel"
        role="tabpanel"
        aria-labelledby={`package-tab-${active}`}
        className="grid gap-10 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3"
      >
        {visible.map((item) => (
          <PackageCard key={`${item.type}|${item.name}|${item.kva}|${item.volt ?? ""}|${item.id}`} item={item} onAdd={setProduct} />
        ))}
      </div>

      <AddToCartDialog product={product} onClose={() => setProduct(null)} />
    </>
  );
}
