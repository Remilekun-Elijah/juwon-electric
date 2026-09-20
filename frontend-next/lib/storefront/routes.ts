// Storefront URLs and navigation (client and server safe). Always link to public paths, never `/storefront/...`:
// proxy.ts rewrites public paths to the storefront segment and redirects the prefixed form.
import { routes } from "@/lib/site";

export const storeRoutes = {
  ...routes,
  checkout: "/checkout",
  checkoutSuccess: "/checkout/success",
  calculator: "/calculator",
  faq: "/faq",
  team: "/team",
} as const;

export type StoreNavItem = { label: string; href: string };

/**
 * Header navigation, in order. Calculator left the list on 2026-09-17, when the gold header button became **Load
 * calculator** (the drawer keeps its own button); Careers joined it on 2026-09-18, after Our Team, so open roles are
 * one click from every page. With products switched off the list is six items.
 */
export const storeNav: StoreNavItem[] = [
  { label: "Packages", href: storeRoutes.packages },
  { label: "Products", href: storeRoutes.products },
  { label: "Services", href: storeRoutes.services },
  { label: "Our work", href: storeRoutes.portfolio },
  { label: "Our Team", href: storeRoutes.team },
  { label: "Careers", href: storeRoutes.vacancies },
  { label: "Contact us", href: storeRoutes.contact },
];

/** Mobile drawer navigation: the same items (Careers is in the header list since 2026-09-18). */
export const storeDrawerNav: StoreNavItem[] = storeNav;

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

/**
 * A Nigerian number in international form for display (2026-09-19): "08144571553" becomes "+2348144571553", and a
 * number that already carries a country code, or any other format, is left as it is.
 */
export const internationalPhone = (phone: string | null | undefined) => {
  const value = (phone || "").trim();
  if (!value || value.startsWith("+")) return value;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) return `+234${digits.slice(1)}`;
  if (digits.length === 13 && digits.startsWith("234")) return `+${digits}`;
  return value;
};

/** First number of a settings phone field that may hold several ("+234…, +234…"). */
export const primaryPhone = (phone: string | null | undefined) =>
  internationalPhone((phone || "").split(/[,;/]/)[0]?.trim() || "");

/** All numbers of a settings phone field. */
export const phoneNumbers = (phone: string | null | undefined) =>
  (phone || "")
    .split(/[,;/]/)
    .map((value) => internationalPhone(value.trim()))
    .filter(Boolean);


/** `tel:` href for a display phone number. */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/** Digits of a phone number for wa.me links: "+234 800 000 0000" gives "2348000000000". Empty when there are none. */
export const whatsappDigits = (phone: string | null | undefined) => (phone || "").replace(/\D/g, "");

/** `https://wa.me/<digits>` with a greeting, or "" when the number has no digits. */
export const whatsappHref = (phone: string | null | undefined, text = "Hello Juwon Electric") => {
  const digits = whatsappDigits(phone);
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : "";
};
