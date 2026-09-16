// Static site facts for the public site (port of frontend/src/utils/config.js routes and socials).
// Environment variables live only in lib/config.ts.

/**
 * Canonical origin for metadata, sitemap and robots. A constant because lib/config.ts is a verbatim shared file
 * without a site URL; see docs/agents/fe-public.md (suggestion to add NEXT_PUBLIC_SITE_URL there).
 */
export const SITE_URL = "https://juwonelectric.com";

export const SITE_NAME = "Juwon Electric";

export const SITE_DESCRIPTION =
  "Let us brighten your daily life. We're dedicated to making a positive impact on our world, starting right here on Earth.";

export const routes = {
  home: "/",
  services: "/services",
  portfolio: "/portfolio",
  packages: "/packages",
  products: "/products",
  vacancies: "/vacancies",
  contact: "/contact",
  cart: "/cart",
} as const;

export const socials = {
  fb: "https://www.facebook.com/juwonelectric?mibextid=LQQJ4d",
  insta: "https://www.instagram.com/juwon__electric",
  tt: "https://www.tiktok.com/@juwon_electric",
  x: "https://x.com/juwon_electric?s=21&t=V5eLolxJSbC7bJ7s6X0dVQ",
} as const;

/** Contact details shown on the Contact page when `GET /settings/public` has none. */
export const contactFallback = {
  phone: "+2348144571553, +2347042394925, +2349032560291",
  email: "inquiries@juwonelectric.com",
  address: "86, aladelola street, Ikosi ketu, Lagos, Nigeria",
} as const;

/** Public revalidation window (FE_CONVENTIONS §4). Route segment configs must use the literal 300. */
export const REVALIDATE_SECONDS = 300;
