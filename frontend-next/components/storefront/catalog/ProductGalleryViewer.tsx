"use client";

import { useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { staggerDelay, storeFocus } from "@/lib/storefront/styles";
import ProductImage from "./ProductImage";

/** Client island for ProductGallery: thumbnails that switch the main image. Thumbnails rise in a stagger on load. */
export default function ProductGalleryViewer({ images, name, className, style }: { images: string[]; name: string; className?: string; style?: CSSProperties }) {
  const [active, setActive] = useState(0);
  const current = Math.min(active, images.length - 1);

  return (
    <div className={className} style={style}>
      <ProductImage
        src={images[current]}
        alt={`${name}, image ${current + 1} of ${images.length}`}
        priority={current === 0}
        sizes="(min-width: 1024px) 560px, (min-width: 768px) 50vw, 100vw"
        className="rounded-2xl border border-slate-200"
        imageClassName="p-6 sm:p-10"
      />
      <ul aria-label="Product images" className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
        {images.map((image, index) => {
          const selected = index === current;
          return (
            <li key={image} style={staggerDelay(index, 50, 350)} className="je-in">
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Show image ${index + 1} of ${images.length}`}
                aria-pressed={selected}
                className={cn(
                  "block w-full overflow-hidden rounded-xl border bg-white transition-colors",
                  storeFocus,
                  selected ? "border-brand-500 ring-1 ring-brand-500" : "border-slate-200 hover:border-slate-300"
                )}
              >
                <ProductImage src={image} alt="" sizes="120px" imageClassName="p-2" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
