// Hosts whose CMS images next/image may resize (next.config.ts `images.remotePatterns`, components/public/SiteImage).
// Pure: imported by next.config.ts, so no "@/" aliases here.

/** Our own API (admin uploads live under /uploads/), plus NEXT_PUBLIC_BACKEND_URL's host when it is a different https host. */
export const OPTIMISED_IMAGE_HOSTS: string[] = (() => {
  const hosts = new Set(["api.juwonelectric.com"]);
  try {
    const backend = new URL(process.env.NEXT_PUBLIC_BACKEND_URL ?? "");
    if (backend.protocol === "https:") hosts.add(backend.hostname);
  } catch {
    // Unset or unparseable: keep the default host only.
  }
  return [...hosts];
})();

/** Path prefix of admin uploads on those hosts. */
export const OPTIMISED_IMAGE_PATH = "/uploads/";

/** True for an https URL on an optimised host under /uploads/, which next/image can resize. */
export function isOptimisedImageUrl(src: string): boolean {
  try {
    const url = new URL(src);
    return url.protocol === "https:" && OPTIMISED_IMAGE_HOSTS.includes(url.hostname) && url.pathname.startsWith(OPTIMISED_IMAGE_PATH);
  } catch {
    return false;
  }
}
