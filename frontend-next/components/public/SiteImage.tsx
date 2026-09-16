import Image, { type ImageProps } from "next/image";

/**
 * next/image for site content. Local files (`/panel-1.webp`) are optimised; SVGs are served as-is by Next.
 * CMS URLs from the admin can point at any https host, so absolute URLs skip optimisation instead of needing every
 * host in `images.remotePatterns`.
 */
export default function SiteImage({ src, alt, unoptimized, ...props }: ImageProps) {
  const external = typeof src === "string" && /^https?:\/\//i.test(src);
  return <Image src={src} alt={alt} unoptimized={unoptimized ?? external} {...props} />;
}
