import Link from "next/link";
import type { ReactNode } from "react";
import { Package } from "lucide-react";
import CustomChip from "@/components/public/CustomChip";
import type { PublicProduct } from "@/lib/api/types";
import { categoryPath, type CategoryNode } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { buttonBase, buttonHover, sectionTitle, siteContainer } from "@/lib/publicStyles";
import { routes } from "@/lib/site";
import ProductCard from "./ProductCard";

type CatalogShellProps = {
  title: string;
  intro?: ReactNode;
  breadcrumb?: ReactNode;
  categories: CategoryNode[];
  /** Slug or id of the category being viewed, for aria-current. */
  activeCategory?: string;
  products: PublicProduct[];
  footer?: ReactNode;
  /** True when the API could not be reached (as opposed to an empty catalogue). */
  unavailable?: boolean;
};

const chip =
  "inter-medium inline-flex min-h-[40px] items-center rounded-full border px-4 text-sm transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2";

/** Shared layout for the product list, paged list and category pages. */
export default function CatalogShell({
  title,
  intro,
  breadcrumb,
  categories,
  activeCategory,
  products,
  footer,
  unavailable = false,
}: CatalogShellProps) {
  return (
    <div className="energyBackground pb-24 pt-32">
      <div className={siteContainer}>
        {breadcrumb}
        <CustomChip text="Products" className="flex justify-center" />
        <h1 className={cn("mb-4 mt-8 text-center text-deep_red", sectionTitle)}>{title}</h1>
        {intro && <div className="inter-medium mx-auto mb-10 max-w-2xl text-center text-base leading-relaxed text-faint">{intro}</div>}

        {categories.length > 0 && (
          <nav aria-label="Product categories" className="mb-10">
            <ul className="flex flex-wrap justify-center gap-2">
              <li>
                <Link
                  href={routes.products}
                  aria-current={!activeCategory ? "page" : undefined}
                  className={cn(chip, !activeCategory ? "border-brand-500 bg-brand-500 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-brand-300")}
                >
                  All products
                </Link>
              </li>
              {categories.map((category) => {
                const active = activeCategory === category.slug || activeCategory === category.id;
                return (
                  <li key={category.id}>
                    <Link
                      href={categoryPath(category)}
                      aria-current={active ? "page" : undefined}
                      className={cn(chip, active ? "border-brand-500 bg-brand-500 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-brand-300")}
                    >
                      {category.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        {products.length === 0 ? (
          <div role="status" className="mx-auto max-w-xl rounded-xl bg-white px-6 py-12 text-center shadow-sm">
            <Package aria-hidden="true" className="mx-auto h-10 w-10 text-brand-500" />
            <h2 className="sora-semibold mt-4 text-xl text-deep_red">
              {unavailable ? "Our product catalogue is coming soon" : "No products here yet"}
            </h2>
            <p className="inter-regular mt-2 text-base text-faint">
              In the meantime, browse our complete solar and inverter packages or ask us for a quote.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href={routes.packages} className={cn(buttonBase, buttonHover, "bg-brand-500 text-white")}>
                View packages
              </Link>
              <Link
                href={routes.contact}
                className={cn(buttonBase, "border-2 border-brand-500 text-brand-500 transition-colors hover:bg-brand-500 hover:text-white")}
              >
                Contact us
              </Link>
            </div>
          </div>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        )}

        {footer}
      </div>
    </div>
  );
}
