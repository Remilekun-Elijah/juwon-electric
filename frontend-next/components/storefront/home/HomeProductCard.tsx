import Link from "next/link";
import PriceTag from "@/components/storefront/PriceTag";
import ProductCardCartButton from "@/components/storefront/cart/ProductCardCartButton";
import StockBadge from "@/components/storefront/StockBadge";
import ContentImage from "@/components/storefront/content/ContentImage";
import type { PublicProduct } from "@/lib/api/types";
import { productPath } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { canBuyOnline, toCartProduct } from "@/lib/storefront/cartProduct";
import { storeCard, storeFocus, storeHoverLift, storeImageZoom } from "@/lib/storefront/styles";

/** Compact product card for the home page: image, brand, name, price, stock and Add to cart when buyable. Server component. */
export default function HomeProductCard({ product }: { product: PublicProduct }) {
  const cartProduct = toCartProduct(product);
  return (
    <article className={cn(storeCard, storeHoverLift, "group relative flex h-full flex-col overflow-hidden")}>
      <ContentImage
        src={product.images?.[0]}
        alt={product.name}
        sizes="(min-width: 1024px) 300px, (min-width: 640px) 50vw, 100vw"
        className="aspect-square border-b border-slate-200 bg-white"
        imageClassName={storeImageZoom}
      />
      <div className="flex flex-1 flex-col p-4">
        {(product.brand || product.category?.name) && (
          <p className="truncate text-xs font-medium uppercase tracking-[0.08em] text-slate-500">{product.brand || product.category?.name}</p>
        )}
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-slate-900 sm:text-base">
          <Link href={productPath(product)} className={cn("rounded-sm after:absolute after:inset-0 after:content-[''] group-hover:text-brand-700", storeFocus)}>
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <PriceTag amount={product.price} size="sm" />
          <StockBadge inStock={product.inStock} />
        </div>
        {canBuyOnline(cartProduct) && <ProductCardCartButton product={cartProduct} className="mt-3" />}
      </div>
    </article>
  );
}
