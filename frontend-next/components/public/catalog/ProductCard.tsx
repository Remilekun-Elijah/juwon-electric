import Link from "next/link";
import { ImageOff } from "lucide-react";
import SiteImage from "@/components/public/SiteImage";
import type { PublicProduct } from "@/lib/api/types";
import { formatPrice, productPath } from "@/lib/catalog";
import { cn } from "@/lib/cn";

/** Catalogue card: image, category, name, brand, price and stock. The whole card is one link. */
export default function ProductCard({ product }: { product: PublicProduct }) {
  const image = product.images?.[0];
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-sm transition-shadow focus-within:shadow-md hover:shadow-md">
      <div className="relative aspect-square bg-offWhite">
        {image ? (
          <SiteImage
            src={image}
            alt=""
            fill
            sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 90vw"
            className="object-contain p-4 transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <ImageOff aria-hidden="true" className="absolute inset-0 m-auto h-10 w-10 text-faint/50" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        {product.category && <p className="inter-medium text-xs uppercase tracking-wide text-faint">{product.category.name}</p>}
        <h3 className="sora-semibold mt-1 text-lg leading-snug text-deep_red">
          <Link
            href={productPath(product)}
            className="rounded-sm after:absolute after:inset-0 after:content-[''] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {product.name}
          </Link>
        </h3>
        {product.brand && <p className="inter-regular text-sm text-slate-600">{product.brand}</p>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <p className="inter-bold text-lg text-slate-900">{formatPrice(product.price)}</p>
          <span
            className={cn(
              "inter-semibold rounded-full px-2.5 py-0.5 text-xs",
              product.inStock ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"
            )}
          >
            {product.inStock ? "In stock" : "Out of stock"}
          </span>
        </div>
      </div>
    </article>
  );
}
