import Link from "next/link";
import PriceTag from "@/components/storefront/PriceTag";
import StockBadge from "@/components/storefront/StockBadge";
import type { CategoryAttribute, PublicProduct } from "@/lib/api/types";
import { attributeRows, productPath } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { storeCard, storeFocus } from "@/lib/storefront/styles";
import ProductImage from "./ProductImage";

export type ProductCardProps = {
  product: PublicProduct;
  /** The product category's attribute schema; the first two attributes are shown as key specs. */
  schema?: CategoryAttribute[];
  headingAs?: "h2" | "h3";
  className?: string;
};

/** Catalogue card: image, brand, name, two key specs, price and stock. The whole card is one link. Server component. */
export default function ProductCard({ product, schema, headingAs: Heading = "h3", className }: ProductCardProps) {
  const specs = attributeRows(product.attributes ?? {}, schema ?? []).slice(0, 2);

  return (
    <article
      className={cn(
        storeCard,
        "group relative flex h-full flex-col overflow-hidden transition-shadow focus-within:shadow-elev-2 hover:shadow-elev-2",
        className
      )}
    >
      <ProductImage
        src={product.images?.[0]}
        alt=""
        sizes="(min-width: 1280px) 280px, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="border-b border-slate-100"
        imageClassName="transition-transform duration-300 motion-safe:group-hover:scale-[1.02]"
      />
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {(product.brand || product.category?.name) && (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {product.brand || product.category?.name}
          </p>
        )}
        <Heading className="mt-1 text-base font-semibold leading-snug tracking-tight text-slate-900">
          <Link
            href={productPath(product)}
            className={cn(
              "rounded-sm transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-brand-700",
              storeFocus
            )}
          >
            {product.name}
          </Link>
        </Heading>

        {specs.length > 0 && (
          <dl className="mt-3 space-y-1 text-sm">
            {specs.map((row) => (
              <div key={row.key} className="flex gap-2">
                <dt className="shrink-0 text-slate-500">{row.label}:</dt>
                <dd className="min-w-0 truncate font-medium text-slate-700">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-4">
          <PriceTag amount={product.price} size="sm" />
          <StockBadge inStock={product.inStock} />
        </div>
      </div>
    </article>
  );
}
