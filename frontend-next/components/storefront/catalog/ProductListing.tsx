import Link from "next/link";
import { Package as PackageIcon, Search, SearchX } from "lucide-react";
import Reveal from "@/components/storefront/motion/Reveal";
import { Button, EmptyState, SearchInput, buttonClasses } from "@/components/ui";
import type { Category, Paged, PublicProduct } from "@/lib/api/types";
import { totalPages } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { storeRoutes } from "@/lib/storefront/routes";
import { storeCard, storeLink } from "@/lib/storefront/styles";
import CatalogPagination from "./CatalogPagination";
import CategoryNav from "./CategoryNav";
import ProductCard from "./ProductCard";

export type ProductListingProps = {
  /** Flat active categories. */
  categories: Category[];
  /** The category the listing is scoped to, if any. */
  category?: Category | null;
  /** One page of products from `getStoreProducts`. */
  result: Paged<PublicProduct>;
  q: string;
  page: number;
  /** Public path the search form and page links point at (`/products` or the category path). */
  basePath: string;
  /** Extra query kept on search and page links, e.g. `{ category }` on `/products?category=…`. */
  keep?: Record<string, string | undefined>;
};

/** Reads `q`, `page` and a string param from Next's `searchParams` object. */
export function readListingParams(searchParams: Record<string, string | string[] | undefined>) {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  const pageNumber = Number.parseInt(first(searchParams.page), 10);
  return {
    q: first(searchParams.q).trim().slice(0, 100),
    page: Number.isFinite(pageNumber) && pageNumber > 0 ? Math.min(pageNumber, 10_000) : 1,
    category: first(searchParams.category).trim(),
  };
}

/** `basePath?q=…&page=…` with empty values and page 1 left out. */
export function listingHref(basePath: string, query: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === "" || (key === "page" && Number(value) <= 1)) continue;
    params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
}

/**
 * Catalogue listing shared by `/products` and `/products/category/[slug]`: category sidebar, GET search form (no
 * JavaScript needed), results count, product grid, link pagination, and empty or no-results states. Server component.
 */
export default function ProductListing({ categories, category, result, q, page, basePath, keep = {} }: ProductListingProps) {
  const schemaById = new Map(categories.map((item) => [item.id, item.attributes ?? []]));
  const pages = totalPages(result);
  const { items, total } = result;
  const start = total ? (Math.min(page, pages) - 1) * result.limit + 1 : 0;
  const end = Math.min(start + items.length - 1, total);
  const scopeLabel = category ? category.name.toLowerCase() : "products";
  const hrefFor = (target: number) => listingHref(basePath, { ...keep, q, page: target });

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-8">
      <CategoryNav categories={categories} activeId={category?.id} className="lg:sticky lg:top-24 lg:self-start" />

      <div className="min-w-0">
        <form action={basePath} method="get" role="search" className={cn(storeCard, "p-3 sm:p-4")}>
          {Object.entries(keep).map(([key, value]) => (value ? <input key={key} type="hidden" name={key} value={value} /> : null))}
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="catalog-search" className="sr-only">
              {category ? `Search ${category.name}` : "Search products"}
            </label>
            <SearchInput
              id="catalog-search"
              name="q"
              size="lg"
              defaultValue={q}
              maxLength={100}
              placeholder={category ? `Search ${scopeLabel}` : "Search inverters, batteries, panels…"}
              wrapperClassName="flex-1"
            />
            <Button type="submit" size="lg" icon={<Search aria-hidden="true" />}>
              Search
            </Button>
          </div>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <h2 className="sr-only">{q ? `Results for ${q}` : category ? `${category.name} products` : "All products"}</h2>
          <p className="text-sm text-slate-500" aria-live="polite">
            {total > 0 && items.length > 0 ? (
              <>
                Showing <span className="tabular-nums">{start}</span>–<span className="tabular-nums">{end}</span> of{" "}
                <span className="tabular-nums">{total}</span> {total === 1 ? "product" : "products"}
                {q && (
                  <>
                    {" "}
                    for <span className="font-medium text-slate-900">“{q}”</span>
                  </>
                )}
              </>
            ) : (
              <>No products to show</>
            )}
          </p>
          {q && (
            <Link href={listingHref(basePath, keep)} className={cn(storeLink, "inline-flex min-h-11 items-center text-sm md:min-h-0")}>
              Clear search
            </Link>
          )}
        </div>

        {items.length > 0 ? (
          <>
            <Reveal as="ul" stagger className="mt-4 grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
              {items.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} schema={product.categoryId ? schemaById.get(product.categoryId) : undefined} />
                </li>
              ))}
            </Reveal>
            <CatalogPagination page={page} pages={pages} hrefFor={hrefFor} className="mt-8 sm:mt-10" />
          </>
        ) : q ? (
          <EmptyState
            standalone
            icon={SearchX}
            className="mt-4"
            title={`No ${scopeLabel} match “${q}”`}
            description="Check the spelling or try a shorter term such as a brand, kVA rating or battery type."
            action={
              <Link href={listingHref(basePath, keep)} className={buttonClasses({ variant: "outline", size: "lg" })}>
                Clear search
              </Link>
            }
          />
        ) : total > 0 ? (
          <EmptyState
            standalone
            icon={SearchX}
            className="mt-4"
            title="This page is empty"
            description={`There are only ${pages} ${pages === 1 ? "page" : "pages"} of ${scopeLabel}.`}
            action={
              <Link href={hrefFor(1)} className={buttonClasses({ variant: "outline", size: "lg" })}>
                Go to the first page
              </Link>
            }
          />
        ) : (
          <EmptyState
            standalone
            icon={PackageIcon}
            className="mt-4"
            title={category ? `No ${scopeLabel} listed yet` : "Our product catalogue is being updated"}
            description="Browse our complete inverter and solar packages, or ask us about a specific item and we’ll check availability."
            action={
              <>
                <Link href={storeRoutes.packages} className={buttonClasses({ size: "lg" })}>
                  Browse packages
                </Link>
                <Link href={storeRoutes.contact} className={buttonClasses({ variant: "outline", size: "lg" })}>
                  Contact us
                </Link>
              </>
            }
          />
        )}
      </div>
    </div>
  );
}
