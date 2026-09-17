/**
 * Public endpoint helpers (FE-1), built on the shared client (FE_CONVENTIONS §3.4).
 * Server components pass `{ next: { revalidate } }`; mutations run client-side and carry the Turnstile token.
 * Types follow agents/be-supervisor:docs/agents/API_CONTRACT_V3.md (see ./types).
 */
import { apiRequest, getPublicData, type ApiRequestInit } from "./client";
import type {
  CartQuote,
  CartRequestItem,
  Category,
  Client,
  ContactPayload,
  Faq,
  OrderPayload,
  Package,
  Paged,
  PlacedOrder,
  PortfolioItem,
  PublicProduct,
  PublicSettings,
  PublicVacancy,
  Reason,
  SaveCartPayload,
  ServicesData,
  SubscribePayload,
  TeamMember,
  Testimonial,
} from "./types";

const seg = (value: string | number) => encodeURIComponent(String(value));

const post = <T>(path: string, body: unknown, init: ApiRequestInit = {}) =>
  apiRequest<T>(path, { ...init, method: "POST", body });

/* ---------- Packages, services, portfolio ---------- */

export const getPackages = (init?: ApiRequestInit) => getPublicData<Package[]>("/packages", undefined, init);

export type PackageQuery = { category?: string };

/**
 * `GET /packages?category=<id|slug>` (Commerce v3 §4): packages in a catalogue category or its descendants; an unknown
 * category gives `[]`. Kept apart from `getPackages(init)` so existing callers keep their signature.
 */
export const getPackagesInCategory = ({ category }: PackageQuery, init?: ApiRequestInit) =>
  getPublicData<Package[]>("/packages", { category: category || undefined }, init);

/** `GET /packages/:id` (the backend also resolves slug and legacy id, but slugs repeat, so use `id`). */
export const getPackage = (id: string | number, init?: ApiRequestInit) =>
  getPublicData<Package>(`/packages/${seg(id)}`, undefined, init);

export const getServices = (init?: ApiRequestInit) => getPublicData<ServicesData>("/services", undefined, init);

export type PortfolioQuery = { featured?: boolean; category?: string };

/** `GET /portfolio?featured=&category=` (Landing v1 §2: `category` is a customer-segment slug). */
export const getPortfolio = (params: PortfolioQuery = {}, init?: ApiRequestInit) =>
  getPublicData<PortfolioItem[]>("/portfolio", { featured: params.featured || undefined, category: params.category || undefined }, init);

export const getPortfolioItem = (id: string, init?: ApiRequestInit) =>
  getPublicData<PortfolioItem>(`/portfolio/${seg(id)}`, undefined, init);

/* ---------- Website content (Landing v1 §1: active only, sorted) ---------- */

/** `GET /faqs?category=` */
export const getFaqs = (params: { category?: string } = {}, init?: ApiRequestInit) =>
  getPublicData<Faq[]>("/faqs", { category: params.category || undefined }, init);

/** `GET /testimonials` (customer reviews). */
export const getTestimonials = (init?: ApiRequestInit) => getPublicData<Testimonial[]>("/testimonials", undefined, init);

/** `GET /clients` (client logos). */
export const getClients = (init?: ApiRequestInit) => getPublicData<Client[]>("/clients", undefined, init);

/** `GET /reasons`: active "Why customers choose us" cards, sorted by `sortOrder`, then `createdAt`. */
export const getReasons = (init?: ApiRequestInit) => getPublicData<Reason[]>("/reasons", undefined, init);

/** `GET /team` (TEAM_AND_MOTION_V1 §1): active team members sorted by `sortOrder`, then `createdAt`. */
export const getTeam = (init?: ApiRequestInit) => getPublicData<TeamMember[]>("/team", undefined, init);

/* ---------- Products & categories (contract §4) ---------- */

/** Active categories as a flat array; build the tree from `parentId`. */
export const getCategories = (init?: ApiRequestInit) => getPublicData<Category[]>("/categories", undefined, init);

export const getCategory = (idOrSlug: string, init?: ApiRequestInit) =>
  getPublicData<Category>(`/categories/${seg(idOrSlug)}`, undefined, init);

export type ProductQuery = { category?: string; q?: string; page?: number; limit?: number };

/** Paged `{ items, page, limit, total }`, active products only. `category` is an id or slug (includes descendants). */
export const getProducts = (params: ProductQuery = {}, init?: ApiRequestInit) =>
  getPublicData<Paged<PublicProduct>>("/products", params, init);

export const getProduct = (idOrSlug: string, init?: ApiRequestInit) =>
  getPublicData<PublicProduct>(`/products/${seg(idOrSlug)}`, undefined, init);

/* ---------- Vacancies (contract §3: open only) ---------- */

export type VacancyQuery = { department?: string; employmentType?: string };

export const getVacancies = (params: VacancyQuery = {}, init?: ApiRequestInit) =>
  getPublicData<PublicVacancy[]>("/vacancies", params, init);

/** 404 unless the vacancy is open. Resolves by slug, then id. */
export const getVacancy = (slug: string, init?: ApiRequestInit) =>
  getPublicData<PublicVacancy>(`/vacancies/${seg(slug)}`, undefined, init);

/* ---------- Settings (contract §8.1) ---------- */

export const getPublicSettings = (init?: ApiRequestInit) =>
  getPublicData<PublicSettings>("/settings/public", undefined, init);

/* ---------- Mutations (client-side) ---------- */

/** `POST /cart/quote` with the same item fields as `placeOrder`. */
export const quoteCart = (items: CartRequestItem[], init?: ApiRequestInit) => post<CartQuote>("/cart/quote", { items }, init);

/** `POST /cart` (abandoned-cart capture; unused by the Vite site). Turnstile action "cart". */
export const saveCart = (payload: SaveCartPayload, init?: ApiRequestInit) => post<unknown>("/cart", payload, init);

export const placeOrder = (payload: OrderPayload, init?: ApiRequestInit) => post<PlacedOrder>("/order", payload, init);

export const submitContact = (payload: ContactPayload, init?: ApiRequestInit) => post<unknown>("/contact", payload, init);

export const subscribe = (payload: SubscribePayload, init?: ApiRequestInit) => post<unknown>("/subscribe", payload, init);
