"use client";

import { useEffect, useId, useState } from "react";
import { Check, PackageSearch, Plus } from "lucide-react";
import { useAdminQuery } from "@/components/admin/AdminContext";
import { Button, SearchInput, Skeleton } from "@/components/ui";
import { getProducts } from "@/lib/api/admin";
import type { Product } from "@/lib/api/types";
import { formatCurrency } from "@/lib/admin/format";
import { cn } from "@/lib/cn";
import { ProductStatusBadge } from "./productBadges";

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
  limit?: number;
  className?: string;
};

const stockText = (product: Product) =>
  product.stockQuantity <= 0 ? "Out of stock" : `${product.stockQuantity} in stock`;

/**
 * Searchable product list from `GET /admin/products?q=`. Shows name, SKU, price, stock and status; archived products
 * can't be picked. Enter picks the only match (handy with a barcode scanner) and never submits the surrounding form.
 */
export function ProductPicker({
  onPick,
  selectedIds,
  label = "Search products",
  placeholder = "Search by name, SKU or brand",
  autoFocus,
  size = "md",
  archivedReason = "Archived",
  limit = 8,
  className,
}: Props) {
  const listId = useId();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    const next = search.trim();
    const timer = window.setTimeout(() => setQ(next), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const results = useAdminQuery(`product-picker:${q}:${limit}`, () => getProducts({ q, limit }), { enabled: Boolean(q) });
  const items = q ? (results.data?.items ?? []) : [];
  const selectable = (product: Product) => product.status !== "archived" && !selectedIds?.has(product.id);
  const pending = Boolean(search.trim()) && (search.trim() !== q || results.loading);

  const pick = (product: Product) => {
    if (!selectable(product)) return;
    onPick(product);
  };

  const renderResults = () => {
    if (!search.trim()) {
      return <p className="px-1 text-sm text-slate-500">Type a name, SKU or brand to find products.</p>;
    }
    if (pending && !items.length) {
      return (
        <ul aria-busy="true" className="space-y-2">
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
    if (!items.length) {
      return (
        <p className="flex items-center gap-2 px-1 text-sm text-slate-500">
          <PackageSearch aria-hidden="true" className="h-4 w-4 text-slate-400" />
          No products match “{q}”.
        </p>
      );
    }
    return (
      <ul id={listId} aria-label="Matching products" className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {items.map((product) => {
          const added = selectedIds?.has(product.id);
          const archived = product.status === "archived";
          const disabled = added || archived;
          return (
            <li key={product.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => pick(product)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 text-left transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500",
                  size === "lg" ? "min-h-14 py-2.5" : "min-h-12 py-2",
                  disabled ? "cursor-not-allowed bg-slate-50/60" : "hover:bg-slate-50"
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
              </button>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className={cn("space-y-2", className)}>
      <SearchInput
        aria-label={label}
        aria-controls={items.length ? listId : undefined}
        placeholder={placeholder}
        size={size}
        autoFocus={autoFocus}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          const choices = items.filter(selectable);
          if (choices.length === 1 && !pending) {
            pick(choices[0]);
            setSearch("");
          }
        }}
      />
      <div aria-live="polite">{renderResults()}</div>
    </div>
  );
}
