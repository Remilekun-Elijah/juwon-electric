/**
 * Public endpoints (backend/routes/public.js, backend/routes/vacancies.js).
 * Payload types are intentionally loose until docs/agents/API_CONTRACT_V3.md lands.
 * Reads accept `init` so server components can set `next: { revalidate }`.
 */
import { apiRequest, getPublicData, type ApiRequestInit } from "./client";

type Row = Record<string, unknown>;

/** Turnstile token field accepted by /contact, /subscribe and /order. */
export type WithTurnstile<T> = T & { turnstileToken?: string };

export const getPackages = (init?: ApiRequestInit) => getPublicData<Row[]>("/packages", undefined, init);
export const getPackage = (id: string, init?: ApiRequestInit) =>
  getPublicData<Row>(`/packages/${encodeURIComponent(id)}`, undefined, init);

export const getServices = (init?: ApiRequestInit) => getPublicData<Row[]>("/services", undefined, init);

export const getPortfolio = (params?: { featured?: boolean }, init?: ApiRequestInit) =>
  getPublicData<Row[]>("/portfolio", params, init);
export const getPortfolioItem = (id: string, init?: ApiRequestInit) =>
  getPublicData<Row>(`/portfolio/${encodeURIComponent(id)}`, undefined, init);

/** Server-side pricing for the cart; send the same item fields as `placeOrder`. */
export const quoteCart = (body: Row) => apiRequest<Row>("/cart/quote", { method: "POST", body });
export const saveCart = (body: Row) => apiRequest<Row>("/cart", { method: "POST", body });
export const placeOrder = (body: WithTurnstile<Row>) => apiRequest<Row>("/order", { method: "POST", body });
export const submitContact = (body: WithTurnstile<Row>) => apiRequest<Row>("/contact", { method: "POST", body });
export const subscribe = (body: WithTurnstile<Row>) => apiRequest<Row>("/subscribe", { method: "POST", body });

export const getVacancies = (init?: ApiRequestInit) => getPublicData<Row[]>("/vacancies", undefined, init);
export const getVacancy = (slug: string, init?: ApiRequestInit) =>
  getPublicData<Row>(`/vacancies/${encodeURIComponent(slug)}`, undefined, init);
