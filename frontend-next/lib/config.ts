// Non-API environment access (FE_CONVENTIONS §3.1). NEXT_PUBLIC_BACKEND_URL is read only by lib/api/client.ts.
// NEXT_PUBLIC_* values are inlined at build time, so they must be read with their literal names.

export const config = {
  /** Cloudflare Turnstile site key. Empty disables Turnstile (no script, no widget, no token). */
  turnstileSiteKey: (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "").trim(),
  /** Canonical public origin for metadataBase, sitemap, robots and OG URLs. No trailing slash. */
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "https://juwonelectric.com").replace(/\/+$/, ""),
};
