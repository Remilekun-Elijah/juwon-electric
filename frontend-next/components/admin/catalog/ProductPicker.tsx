"use client";

import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { Check, PackageSearch, Plus } from "lucide-react";
import { useAdminQuery } from "@/components/admin/AdminContext";
import { Button, SearchInput, Skeleton } from "@/components/ui";
import { getProducts } from "@/lib/api/admin";
import type { Product } from "@/lib/api/types";
import { formatCurrency } from "@/lib/admin/format";
import { cn } from "@/lib/cn";
import { ProductStatusBadge } from "./productBadges";

/** Commerce v3 §5: products listed as soon as the empty search field is focused. */
const BROWSE_LIMIT = 20;

type Props = {
  onPick: (product: Product) => void;
  /** Products already chosen: shown as "Added" and not selectable. */
  selectedIds?: ReadonlySet<string>;
  /** Accessible label for the search box. */
  label?: string;
  placeholder?: string;
  autoFocus?: boolean;
  /** `lg` gives 44 px rows and input (in-store sale on phones). */
  size?: "md" | "lg";
  /** Reason shown on archived rows. */
  archivedReason?: string;
  /** Results per search. */
  limit?: number;
  className?: string;
};

const stockText = (product: Product) =>
  product.stockQuantity <= 0 ? "Out of stock" : `${product.stockQuantity} in stock`;

const byName = (a: Product, b: Product) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

/**
 * Product search combobox over `GET /admin/products`. Focusing the empty field lists the first 20 products by name;
 * typing searches by name, SKU or brand. Arrow keys move through the list, Enter adds the highlighted product (or the
 * only match, handy with a barcode scanner) and never submits the surrounding form, Esc closes the list. Archived and
 * already added products can't be picked. The list scrolls inside a fixed height, so it never covers the page.
 */
export function ProductPicker({
  onPick,
  selectedIds,
  label = "Search products",
  placeholder = "Search by name, SKU or brand",
  autoFocus,
  size = "md",
  archivedReason = "Archived",
  limit = 10,
  className,
}: Props) {
  const baseId = useId().replace(/:/g, "");
  const listId = `${baseId}-list`;
  const optionId = (index: number) => `${baseId}-option-${index}`;
  const listRef = useRef<HTMLUListElement>(null);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(Boolean(autoFocus));
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const next = search.trim();
    const timer = window.setTimeout(() => setQ(next), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const browsing = !q;
  const results = useAdminQuery(
    browsing ? `product-picker:browse:${BROWSE_LIMIT}` : `product-picker:${q}:${limit}`,
    () => (browsing ? getProducts({ limit: BROWSE_LIMIT }) : getProducts({ q, limit })),
    { enabled: open }
  );
  const fetched = results.data?.items ?? [];
  const items = browsing ? [...fetched].sort(byName) : fetched;
  const selectable = (product: Product) => product.status !== "archived" && !selectedIds?.has(product.id);
  const pending = search.trim() !== q || results.loading;
  const showList = open && items.length > 0 && !(pending && !results.data);
  const activeIndex = showList && active < items.length ? active : -1;

  useEffect(() => {
    if (activeIndex < 0) return;
    const option = listRef.current?.querySelectorAll<HTMLElement>('[role="option"]')[activeIndex];
    option?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex]);

  const pick = (product: Product) => {
    if (!selectable(product)) return;
    onPick(product);
  };

  const move = (step: 1 | -1) => {
    if (!items.length) return;
    let next = activeIndex;
    for (let count = 0; count < items.length; count += 1) {
      next = next < 0 ? (step === 1 ? 0 : items.length - 1) : (next + step + items.length) % items.length;
      if (selectable(items[next])) break;
    }
    setActive(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        move(event.key === "ArrowDown" ? 1 : -1);
        return;
      case "Home":
      case "End":
        if (!showList) return;
        event.preventDefault();
        setActive(event.key === "Home" ? 0 : items.length - 1);
        return;
      case "Enter": {
        event.preventDefault();
        if (activeIndex >= 0 && showList) {
          pick(items[activeIndex]);
          return;
        }
        const choices = items.filter(selectable);
        if (search.trim() && choices.length === 1 && !pending) {
          pick(choices[0]);
          setSearch("");
          setActive(-1);
        }
        return;
      }
      case "Escape":
        if (!open) return;
        // Close the list only; the surrounding dialog or drawer stays open.
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        setActive(-1);
        return;
      default:
    }
  };

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setOpen(false);
    setActive(-1);
  };

  const renderStatus = () => {
    if (!open) return null;
    if (pending && !results.data) {
      return (
        <ul aria-busy="true" aria-label="Loading products" className="space-y-2">
          {Array.from({ length: 3 }, (_, index) => (
            <li key={index}>
              <Skeleton className={cn("w-full", size === "lg" ? "h-14" : "h-12")} />
            </li>
          ))}
        </ul>
      );
    }
    if (results.error && !results.data) {
      return (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>Products couldn’t be loaded. {results.error}</span>
          <Button variant="outline" size="sm" onClick={results.reload} loading={results.loading}>
            Try again
          </Button>
        </div>
      );
    }
    if (!items.length && !pending) {
      return (
        <p className="flex items-center gap-2 px-1 text-sm text-slate-500">
          <PackageSearch aria-hidden="true" className="h-4 w-4 text-slate-400" />
          {q ? `No products match “${q}”.` : "No products yet. Add products in the catalogue first."}
        </p>
      );
    }
    return null;
  };

  return (
    <div className={cn("space-y-2", className)} onBlur={onBlur}>
      <SearchInput
        role="combobox"
        aria-label={label}
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
        autoComplete="off"
        placeholder={placeholder}
        size={size}
        autoFocus={autoFocus}
        value={search}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(event) => {
          setSearch(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onKeyDown={onKeyDown}
      />
      <div aria-live="polite" className="sr-only">
        {open && !pending && results.data ? `${items.length} product${items.length === 1 ? "" : "s"} listed.` : ""}
      </div>
      {renderStatus()}
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={q ? "Matching products" : "Products"}
        hidden={!showList}
        className={cn(
          "max-h-72 divide-y divide-slate-100 overflow-y-auto overscroll-contain rounded-lg border border-slate-200 bg-white shadow-elev-1 sm:max-h-80",
          pending && "opacity-70"
        )}
      >
        {showList && !q && (
          <li role="presentation" className="bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
            Showing the first {items.length} products by name. Type to search.
          </li>
        )}
        {showList &&
          items.map((product, index) => {
            const added = selectedIds?.has(product.id);
            const archived = product.status === "archived";
            const disabled = added || archived;
            const highlighted = index === activeIndex;
            return (
              <li
                key={product.id}
                id={optionId(index)}
                role="option"
                aria-selected={highlighted}
                aria-disabled={disabled || undefined}
                // Keep focus in the search box so the list stays open and keyboard users keep their place.
                onMouseDown={(event) => event.preventDefault()}
                onMouseMove={() => {
                  if (!disabled && active !== index) setActive(index);
                }}
                onClick={() => pick(product)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 text-left transition-colors",
                  size === "lg" ? "min-h-14 py-2.5" : "min-h-12 py-2",
                  disabled ? "cursor-not-allowed bg-slate-50/60" : "cursor-pointer",
                  highlighted && !disabled && "bg-brand-50"
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={cn("truncate text-sm font-medium", disabled ? "text-slate-500" : "text-slate-900")}>
                      {product.name}
                    </span>
                    {product.status !== "active" && <ProductStatusBadge status={product.status} />}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                    <span className="font-mono">{product.sku}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums text-slate-700">{formatCurrency(product.price)}</span>
                    <span aria-hidden="true">·</span>
                    <span className={cn("tabular-nums", product.stockQuantity <= 0 && "text-red-600")}>{stockText(product)}</span>
                  </span>
                </span>
                <span className="shrink-0 text-xs font-medium">
                  {added ? (
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <Check aria-hidden="true" className="h-4 w-4" />
                      Added
                    </span>
                  ) : archived ? (
                    <span className="text-slate-500">{archivedReason}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-brand-700">
                      <Plus aria-hidden="true" className="h-4 w-4" />
                      Add
                    </span>
                  )}
                </span>
              </li>
            );
          })}
      </ul>
    </div>
  );
}
