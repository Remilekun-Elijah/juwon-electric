import { ImageIcon } from "lucide-react";
import SiteImage from "@/components/public/SiteImage";
import { cn } from "@/lib/cn";

export type ContentImageProps = {
  /** Local path (`/panel-1.webp`) or a CMS https URL. Blank shows a neutral placeholder. */
  src: string | null | undefined;
  alt: string;
  /** `sizes` for the responsive image. */
  sizes: string;
  /** Aspect ratio and radius classes for the frame, e.g. `aspect-[4/3] rounded-xl`. */
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

/** Accepts local paths and https URLs only; anything else renders the placeholder. */
const usableSrc = (src: string | null | undefined) => {
  const value = (src || "").trim();
  if (!value) return "";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return /^https:\/\//i.test(value) ? value : "";
};

/**
 * Sized image frame for API content (services, portfolio, products). The frame always has a width from its parent
 * and a height from its aspect ratio, so grids never collapse to 0 px (classic finding FP-01).
 * Photos fill the frame (`object-cover`); SVG illustrations are contained with padding so they aren't cropped.
 * Server component.
 */
export default function ContentImage({ src, alt, sizes, className, imageClassName, priority }: ContentImageProps) {
  const url = usableSrc(src);
  return (
    <div className={cn("relative w-full overflow-hidden bg-slate-100", className)}>
      {url ? (
        <SiteImage
          src={url}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn(/\.svg($|\?)/i.test(url) ? "object-contain p-4" : "object-cover", imageClassName)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400">
          <ImageIcon aria-hidden="true" className="h-8 w-8" />
          {alt && <span className="sr-only">{alt}</span>}
        </div>
      )}
    </div>
  );
}
