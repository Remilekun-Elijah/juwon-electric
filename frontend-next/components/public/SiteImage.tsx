import Image, { type ImageProps } from "next/image";
import { isOptimisedImageUrl } from "@/lib/images";

/**
 * next/image for site content. Local files (`/panel-1.webp`) and admin uploads on our own API (lib/images) are
 * optimised; SVGs are served as-is by Next. Other CMS URLs can point at any https host, so they skip optimisation
 * instead of needing every host in `images.remotePatterns`.
 */
export default function SiteImage({ src, alt, unoptimized, ...props }: ImageProps) {
  const external = typeof src === "string" && /^https?:\/\//i.test(src) && !isOptimisedImageUrl(src);
  return <Image src={src} alt={alt} unoptimized={unoptimized ?? external} {...props} />;
}
