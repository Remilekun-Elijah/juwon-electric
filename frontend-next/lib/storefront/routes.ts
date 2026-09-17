// Storefront URLs and navigation (client and server safe). Always link to public paths, never `/storefront/...`:
// proxy.ts rewrites public paths to the storefront segment and redirects the prefixed form.
import { routes } from "@/lib/site";

export const storeRoutes = {
  ...routes,
  checkout: "/checkout",
  checkoutSuccess: "/checkout/success",
} as const;

export type StoreNavItem = { label: string; href: string };

/** Header and mobile drawer navigation, in order. */
export const storeNav: StoreNavItem[] = [
  { label: "Packages", href: storeRoutes.packages },
  { label: "Products", href: storeRoutes.products },
  { label: "Services", href: storeRoutes.services },
  { label: "Our work", href: storeRoutes.portfolio },
  { label: "Careers", href: storeRoutes.vacancies },
  { label: "Contact", href: storeRoutes.contact },
];

/** sessionStorage key for the last placed order summary (written by checkout, read by /checkout/success). */
export const LAST_ORDER_KEY = "je/last-order";

/** `/contact?topic=<topic>` for "Ask about this product" style links. */
export const contactTopicPath = (topic: string) => `${storeRoutes.contact}?topic=${encodeURIComponent(topic)}`;

/** Strips a leading `/storefront` so active-link checks work whether a component sees the public or rewritten path. */
export const publicPathname = (pathname: string | null | undefined) => {
  const path = pathname || "/";
  if (path === "/storefront") return "/";
  return path.startsWith("/storefront/") ? path.slice("/storefront".length) : path;
};

/** True when `href` is the current page or one of its children (`/products` is active on `/products/x`). */
export const isActivePath = (pathname: string | null | undefined, href: string) => {
  const path = publicPathname(pathname);
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
};

/** First number of a settings phone field that may hold several ("+234…, +234…"). */
export const primaryPhone = (phone: string | null | undefined) => (phone || "").split(/[,;/]/)[0]?.trim() || "";

/** All numbers of a settings phone field. */
export const phoneNumbers = (phone: string | null | undefined) =>
  (phone || "")
    .split(/[,;/]/)
    .map((value) => value.trim())
    .filter(Boolean);

/** `tel:` href for a display phone number. */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
