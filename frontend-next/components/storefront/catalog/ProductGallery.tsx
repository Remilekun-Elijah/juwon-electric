import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import ProductGalleryViewer from "./ProductGalleryViewer";
import ProductImage from "./ProductImage";

export type ProductGalleryProps = {
  images: string[] | null | undefined;
  name: string;
  className?: string;
  style?: CSSProperties;
};

const MAX_IMAGES = 8;

/**
 * Product gallery: main image with thumbnails. A single image (or none) renders on the server; several images use the
 * small ProductGalleryViewer client island to switch the main image.
 */
export default function ProductGallery({ images, name, className, style }: ProductGalleryProps) {
  const list = Array.from(new Set((images ?? []).filter(Boolean))).slice(0, MAX_IMAGES);

  if (list.length <= 1) {
    return (
      <div className={className} style={style}>
        <ProductImage
          src={list[0]}
          alt={list[0] ? name : `No image yet for ${name}`}
          priority
          sizes="(min-width: 1024px) 560px, (min-width: 768px) 50vw, 100vw"
          className="rounded-2xl border border-slate-200"
          imageClassName="p-6 sm:p-10"
        />
      </div>
    );
  }

  return <ProductGalleryViewer images={list} name={name} className={cn(className)} style={style} />;
}
