// Non-API environment access (FE_CONVENTIONS §3.1). NEXT_PUBLIC_BACKEND_URL is read only by lib/api/client.ts.
// NEXT_PUBLIC_* values are inlined at build time, so they must be read with their literal names.

export const config = {
  /** Cloudflare Turnstile site key. Empty disables Turnstile (no script, no widget, no token). */
  turnstileSiteKey: (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "").trim(),
  /** Canonical public origin for metadataBase, sitemap, robots and OG URLs. No trailing slash. */
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "https://juwonelectric.com").replace(/\/+$/, ""),
  /** Admin preview: contract mock fallback for backend routes that don't exist yet. Never enable in production. */
  adminPreview: process.env.NEXT_PUBLIC_ADMIN_PREVIEW === "true",
  /**
   * Public UI: "classic" serves the ported Vite-look site in app/(public); anything else (including unset) serves the
   * storefront in app/storefront. proxy.ts applies the same rule. Inlined at build time, so changing it needs a rebuild.
   */
  publicUi: (process.env.NEXT_PUBLIC_PUBLIC_UI === "classic" ? "classic" : "storefront") as "classic" | "storefront",
};

/** True only while `next build` prerenders pages (server only; NEXT_PHASE is not inlined). */
export const isBuildPhase = () => process.env.NEXT_PHASE === "phase-production-build";
