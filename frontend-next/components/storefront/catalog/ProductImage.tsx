import { ImageOff } from "lucide-react";
import SiteImage from "@/components/public/SiteImage";
import { cn } from "@/lib/cn";

export type ProductImageProps = {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
};

/**
 * Square product image on a slate-50 tile, or a placeholder icon. Uses SiteImage (API image hosts render unoptimised,
 * so no `images.remotePatterns` entry is needed). Server and client safe.
 */
export default function ProductImage({ src, alt, sizes, priority = false, className, imageClassName }: ProductImageProps) {
  return (
    <div className={cn("relative aspect-square overflow-hidden bg-slate-50", className)}>
      {src ? (
        <SiteImage src={src} alt={alt} fill sizes={sizes} priority={priority} className={cn("object-contain p-4", imageClassName)} />
      ) : (
        <ImageOff aria-hidden="true" className="absolute inset-0 m-auto h-10 w-10 text-slate-300" />
      )}
    </div>
  );
}
