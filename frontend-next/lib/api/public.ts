/**
 * Public endpoint helpers (FE-1). Built on the shared client in ./client.
 * Server components pass `{ next: { revalidate } }`; mutations run client-side.
 */
import { apiRequest, toQuery, type ApiInit } from "./client";
import type {
  CartQuote,
  Category,
  ContactPayload,
  OrderItem,
  OrderPayload,
  Package,
  Paged,
  PlacedOrder,
  PortfolioItem,
  PublicProduct,
  PublicSettings,
  PublicVacancy,
  ServicesData,
  SubscribePayload,
} from "./types";

const seg = (value: string | number) => encodeURIComponent(String(value));

const post = <T>(path: string, body: unknown, init: ApiInit = {}) =>
  apiRequest<T>(path, { ...init, method: "POST", body: JSON.stringify(body) });

/* ---------- Catalog content ---------- */

export const getPackages = (init?: ApiInit) => apiRequest<Package[]>("/packages", init);

/** Resolves by id, then slug, then legacy id (backend `getCollectionItem`). */
export const getPackage = (id: string | number, init?: ApiInit) => apiRequest<Package>(`/packages/${seg(id)}`, init);

export const getServices = (init?: ApiInit) => apiRequest<ServicesData>("/services", init);

export const getPortfolio = (params: { featured?: boolean } = {}, init?: ApiInit) =>
  apiRequest<PortfolioItem[]>(`/portfolio${toQuery(params)}`, init);

/* ---------- Products & categories (contract §4) ---------- */

export const getCategories = (init?: ApiInit) => apiRequest<Category[]>("/categories", init);

export const getCategory = (idOrSlug: string, init?: ApiInit) =>
  apiRequest<Category>(`/categories/${seg(idOrSlug)}`, init);

export type ProductQuery = { category?: string; q?: string; page?: number; limit?: number };

export const getProducts = (params: ProductQuery = {}, init?: ApiInit) =>
  apiRequest<Paged<PublicProduct>>(`/products${toQuery(params)}`, init);

export const getProduct = (idOrSlug: string, init?: ApiInit) =>
  apiRequest<PublicProduct>(`/products/${seg(idOrSlug)}`, init);

/* ---------- Vacancies (contract §3: open only) ---------- */

export type VacancyQuery = { department?: string; employmentType?: string };

export const getVacancies = (params: VacancyQuery = {}, init?: ApiInit) =>
  apiRequest<PublicVacancy[]>(`/vacancies${toQuery(params)}`, init);

/** 404 unless the vacancy is open. */
export const getVacancy = (slug: string, init?: ApiInit) => apiRequest<PublicVacancy>(`/vacancies/${seg(slug)}`, init);

/* ---------- Settings (contract §8.1) ---------- */

export const getPublicSettings = (init?: ApiInit) => apiRequest<PublicSettings>("/settings/public", init);

/* ---------- Mutations (client-side, Turnstile token in the body) ---------- */

export const quoteCart = (items: OrderItem[], init?: ApiInit) => post<CartQuote>("/cart/quote", { items }, init);

export const placeOrder = (payload: OrderPayload, init?: ApiInit) => post<PlacedOrder>("/order", payload, init);

export const sendContact = (payload: ContactPayload, init?: ApiInit) => post<unknown>("/contact", payload, init);

export const subscribe = (payload: SubscribePayload, init?: ApiInit) => post<unknown>("/subscribe", payload, init);
