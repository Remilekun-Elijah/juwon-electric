// Server only: import from server components, route handlers and metadata files, never from "use client" modules.
// (The `server-only` package isn't installed, so this comment stands in for `import "server-only"`.)
/**
 * Storefront data layer (docs/agents/fe-storefront.md §2.2).
 *
 * - Every read is cached for STORE_REVALIDATE seconds and tagged `store` plus its own tags, so the admin console can
 *   expire it on demand through `POST /api/storefront/revalidate`.
 * - A 404 resolves to `null`; callers use `notFound()`.
 * - Any other failure during `next build` logs a warning and returns the fallback, so the build passes with the API
 *   down. At runtime it is rethrown: Next keeps serving the last good cached page, and a page with no cache entry
 *   shows app/storefront/error.tsx. Fallback content is never cached over real data.
 */
import { cache } from "react";
import { ApiError, type ApiEnvelope, type ApiRequestInit } from "@/lib/api/client";
import {
  getCategories,
  getClients,
  getFaqs,
  getPackage,
  getPackages,
  getPackagesInCategory,
  getPortfolio,
  getProduct,
  getProducts,
  getPublicSettings,
  getServices,
  getTestimonials,
  getVacancies,
  getVacancy,
  type ProductQuery,
  type VacancyQuery,
} from "@/lib/api/public";
import type {
  Category,
  Client,
  Faq,
  Package,
  Paged,
  PortfolioItem,
  PublicProduct,
  PublicSettings,
  PublicVacancy,
  ServicesData,
  Testimonial,
  WebsiteStat,
} from "@/lib/api/types";
import { PRODUCTS_PER_PAGE, emptyPage } from "@/lib/catalog";
import { isBuildPhase } from "@/lib/config";
import { fallbackCustomers, fallbackOfferings, fallbackPackages, fallbackPortfolio } from "@/lib/fallbacks";
import { SITE_NAME, contactFallback } from "@/lib/site";
import { isOpenVacancy } from "@/lib/vacancies";
import type { StoreCalculator } from "./calculator";
import type { StoreFinancing } from "./financing";

/** Time-based safety net in seconds. Route segment configs must export the literal: `export const revalidate = 60`. */
export const STORE_REVALIDATE = 60;

/** Abort slow reads so an unreachable API can't stall a render or the build. */
const TIMEOUT_MS = 8000;

/** Every cache tag the storefront uses. The revalidate route only accepts these. */
export const STORE_TAGS = [
  "store",
  "packages",
  "products",
  "categories",
  "services",
  "portfolio",
  "vacancies",
  "settings",
  "faqs",
  "testimonials",
  "clients",
] as const;

export type StoreTag = (typeof STORE_TAGS)[number];

export const isStoreTag = (value: unknown): value is StoreTag =>
  typeof value === "string" && (STORE_TAGS as readonly string[]).includes(value);

/** Fetch options for a tagged storefront read. */
export const storeInit = (tags: StoreTag[]): ApiRequestInit => ({
  next: { revalidate: STORE_REVALIDATE, tags: Array.from(new Set<string>(["store", ...tags])) },
  signal: AbortSignal.timeout(TIMEOUT_MS),
});

export type StoreReadOptions<T> = {
  tags: StoreTag[];
  /** Used only during `next build` when the API fails. Without one the build gets `null`. */
  fallback?: T;
};

/**
 * Runs `request(init)` with the storefront cache options and returns its `data`.
 * `null` on 404 (or a null payload); build-time failures return `fallback`; runtime failures throw.
 */
export async function storeRead<T>(
  label: string,
  request: (init: ApiRequestInit) => Promise<ApiEnvelope<T>>,
  { tags, fallback }: StoreReadOptions<T>
): Promise<T | null> {
  try {
    const { data } = await request(storeInit(tags));
    return data ?? null;
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 0;
    if (status === 404) return null;
    if (isBuildPhase()) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[storefront] ${label} unavailable at build (${status || "network"}): ${message}; using fallback`);
      return fallback ?? null;
    }
    throw error;
  }
}

/* ---------- Packages ---------- */

const readAllPackages = cache(
  async (): Promise<Package[]> =>
    (await storeRead("GET /packages", (init) => getPackages(init), { tags: ["packages"], fallback: fallbackPackages })) ?? []
);

// The category filter includes descendants and is resolved by the API, so it is tagged `categories` too. The build
// fallback is empty: the bundled fallback packages have no category.
const readCategoryPackages = cache(
  async (category: string): Promise<Package[]> =>
    (await storeRead(`GET /packages?category=${category}`, (init) => getPackagesInCategory({ category }, init), {
      tags: ["packages", "categories"],
      fallback: [],
    })) ?? []
);

export type StorePackageQuery = { category?: string };

/**
 * `GET /packages`, or with `category` (id or slug) `GET /packages?category=` (Commerce v3 §4: that category and its
 * descendants). Empty when the route is missing.
 */
export const getStorePackages = (query: StorePackageQuery = {}): Promise<Package[]> => {
  const category = query.category?.trim() ?? "";
  return category ? readCategoryPackages(category) : readAllPackages();
};

/** `GET /packages/:id`, or `null` (use `notFound()`). */
export const getStorePackage = cache(
  async (id: string): Promise<Package | null> =>
    storeRead(`GET /packages/${id}`, (init) => getPackage(id, init), {
      tags: ["packages"],
      fallback: fallbackPackages.find((item) => String(item.id) === id),
    })
);

/* ---------- Catalogue ---------- */

/** `GET /categories`, active only, flat (build the tree with `buildCategoryTree` from lib/catalog). */
export const getStoreCategories = cache(async (): Promise<Category[]> => {
  const categories = await storeRead("GET /categories", (init) => getCategories(init), { tags: ["categories"], fallback: [] });
  return (categories ?? []).filter((category) => category.isActive !== false);
});

export type StoreProductQuery = ProductQuery;

const readProducts = cache(async (category: string, q: string, page: number, limit: number): Promise<Paged<PublicProduct>> => {
  const params: ProductQuery = { category: category || undefined, q: q || undefined, page, limit };
  const label = `GET /products?category=${category}&q=${q}&page=${page}&limit=${limit}`;
  const result = await storeRead(label, (init) => getProducts(params, init), {
    tags: ["products", "categories"],
    fallback: emptyPage(limit),
  });
  return result ?? emptyPage(limit);
});

/** `GET /products` (paged, active only). `category` is an id or slug and includes descendants. Default limit 24. */
export const getStoreProducts = (query: StoreProductQuery = {}): Promise<Paged<PublicProduct>> =>
  readProducts(query.category ?? "", query.q?.trim() ?? "", Math.max(1, Math.trunc(query.page ?? 1)), query.limit ?? PRODUCTS_PER_PAGE);

/** `GET /products/:idOrSlug`, or `null` (use `notFound()`). */
export const getStoreProduct = cache(
  async (slugOrId: string): Promise<PublicProduct | null> =>
    storeRead(`GET /products/${slugOrId}`, (init) => getProduct(slugOrId, init), { tags: ["products"] })
);

/* ---------- Services and portfolio ---------- */

const fallbackServices: ServicesData = { offerings: fallbackOfferings, customerSegments: fallbackCustomers };

/** `GET /services`: offerings and customer segments. */
export const getStoreServices = cache(async (): Promise<ServicesData> => {
  const data = await storeRead("GET /services", (init) => getServices(init), { tags: ["services"], fallback: fallbackServices });
  return { offerings: data?.offerings ?? [], customerSegments: data?.customerSegments ?? [] };
});

const readPortfolio = cache(
  async (featured: boolean, category: string): Promise<PortfolioItem[]> => {
    const label = `GET /portfolio?featured=${featured}&category=${category}`;
    const data = await storeRead(label, (init) => getPortfolio({ featured, category }, init), {
      tags: ["portfolio"],
      // The bundled fallback projects have no category, so a filtered build read gets none.
      fallback: category ? [] : fallbackPortfolio,
    });
    return data ?? [];
  }
);

export type StorePortfolioQuery = { featured?: boolean; category?: string };

/**
 * `GET /portfolio`, optionally `featured` only and/or one `category` (a customer-segment slug, Landing v1 §2).
 * `getStorePortfolio(true)` still means featured only.
 */
export const getStorePortfolio = (query: boolean | StorePortfolioQuery = {}): Promise<PortfolioItem[]> => {
  const { featured = false, category = "" } = typeof query === "boolean" ? { featured: query } : query;
  return readPortfolio(featured, category.trim());
};

/* ---------- Website content (Landing v1 §1) ---------- */

const readFaqs = cache(
  async (category: string): Promise<Faq[]> =>
    (await storeRead<Faq[]>(`GET /faqs?category=${category}`, (init) => getFaqs({ category }, init), { tags: ["faqs"], fallback: [] })) ?? []
);

/** `GET /faqs` (active, sorted), optionally one category. Empty when the route is missing. */
export const getStoreFaqs = (category?: string): Promise<Faq[]> => readFaqs(category?.trim() ?? "");

/** `GET /testimonials`: customer reviews (active, sorted). */
export const getStoreTestimonials = cache(
  async (): Promise<Testimonial[]> =>
    (await storeRead<Testimonial[]>("GET /testimonials", (init) => getTestimonials(init), { tags: ["testimonials"], fallback: [] })) ?? []
);

/** `GET /clients`: client logos (active, sorted). */
export const getStoreClients = cache(
  async (): Promise<Client[]> => (await storeRead<Client[]>("GET /clients", (init) => getClients(init), { tags: ["clients"], fallback: [] })) ?? []
);

/* ---------- Vacancies ---------- */

export type StoreVacancyQuery = VacancyQuery;

const readVacancies = cache(async (department: string, employmentType: string): Promise<PublicVacancy[]> => {
  const params: VacancyQuery = { department: department || undefined, employmentType: employmentType || undefined };
  const data = await storeRead(`GET /vacancies?department=${department}&employmentType=${employmentType}`, (init) => getVacancies(params, init), {
    tags: ["vacancies"],
    fallback: [],
  });
  return (data ?? []).filter(isOpenVacancy);
});

/** `GET /vacancies` (open roles only). */
export const getStoreVacancies = (query: StoreVacancyQuery = {}): Promise<PublicVacancy[]> =>
  readVacancies(query.department ?? "", query.employmentType ?? "");

/** `GET /vacancies/:slug`, or `null` when missing or not open (use `notFound()`). */
export const getStoreVacancy = cache(async (slug: string): Promise<PublicVacancy | null> => {
  const vacancy = await storeRead(`GET /vacancies/${slug}`, (init) => getVacancy(slug, init), { tags: ["vacancies"] });
  return vacancy && isOpenVacancy(vacancy) ? vacancy : null;
});

/* ---------- Settings ---------- */

/** Public settings with display fallbacks applied: phone, email and address are always strings. */
export type StoreSettings = {
  business: {
    name: string;
    phone: string;
    email: string;
    address: string;
    website: string | null;
  };
  payments: { gatewayEnabled: boolean };
  /** Landing v1 §3 `website`, with empty values normalised to null and blank stats dropped. */
  website: {
    stats: WebsiteStat[];
    whatsappNumber: string | null;
    businessHours: string | null;
    sample: boolean;
  };
  /** Terms when financing is enabled and has at least one term, otherwise null (the section hides). */
  financing: StoreFinancing | null;
  /** Calculator settings when enabled, otherwise null (the page shows "Talk to an engineer"). */
  calculator: StoreCalculator | null;
};

const text = (value: string | null | undefined) => (typeof value === "string" && value.trim() ? value.trim() : null);
const num = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);

function toStoreFinancing(financing: PublicSettings["financing"] | undefined): StoreFinancing | null {
  if (!financing || financing.enabled !== true) return null;
  const termsMonths = Array.from(new Set((financing.termsMonths ?? []).filter((months) => Number.isInteger(months) && months > 0))).sort((a, b) => a - b);
  if (!termsMonths.length) return null;
  return {
    depositPercent: typeof financing.depositPercent === "number" ? financing.depositPercent : null,
    termsMonths,
    monthlyRatePercent: typeof financing.monthlyRatePercent === "number" ? financing.monthlyRatePercent : null,
    approvalTime: text(financing.approvalTime),
    note: text(financing.note),
    sample: financing.sample === true,
  };
}

function toStoreCalculator(calculator: PublicSettings["calculator"] | undefined): StoreCalculator | null {
  if (!calculator || calculator.enabled !== true) return null;
  const generator = calculator.generator ?? { fuelPricePerLitre: 0, litresPerKvaHour: 0, maintenancePerMonth: 0 };
  return {
    appliances: (calculator.appliances ?? []).filter((appliance) => appliance.key && appliance.label && appliance.watts > 0),
    inverterHeadroomPercent: num(calculator.inverterHeadroomPercent, 25),
    batteryDepthOfDischargePercent: num(calculator.batteryDepthOfDischargePercent, 80),
    batteryVoltage: num(calculator.batteryVoltage, 48),
    panelWatts: num(calculator.panelWatts, 550),
    peakSunHours: num(calculator.peakSunHours, 4.5),
    generator: {
      fuelPricePerLitre: num(generator.fuelPricePerLitre, 0),
      litresPerKvaHour: num(generator.litresPerKvaHour, 0),
      maintenancePerMonth: num(generator.maintenancePerMonth, 0),
    },
    sample: calculator.sample === true,
  };
}

const withContactFallback = (settings: PublicSettings | null): StoreSettings => ({
  business: {
    name: settings?.business?.name || SITE_NAME,
    phone: settings?.business?.phone || contactFallback.phone,
    email: settings?.business?.email || contactFallback.email,
    address: settings?.business?.address || contactFallback.address,
    website: settings?.business?.website ?? null,
  },
  payments: { gatewayEnabled: settings?.payments?.gatewayEnabled === true },
  website: {
    stats: (settings?.website?.stats ?? []).filter((stat) => text(stat.label) && text(stat.value)).slice(0, 4),
    whatsappNumber: text(settings?.website?.whatsappNumber),
    businessHours: text(settings?.website?.businessHours),
    sample: settings?.website?.sample === true,
  },
  financing: toStoreFinancing(settings?.financing),
  calculator: toStoreCalculator(settings?.calculator),
});

/** `GET /settings/public`, with `contactFallback` (lib/site.ts) per empty field. Throws at runtime like every read. */
export const getStoreSettings = cache(
  async (): Promise<StoreSettings> =>
    withContactFallback(await storeRead("GET /settings/public", (init) => getPublicSettings(init), { tags: ["settings"] }))
);

/**
 * Settings for the layout chrome (header phone, footer details) only. Never throws: an error in a layout can't reach
 * app/storefront/error.tsx, so an outage shows `contactFallback` in the chrome instead of breaking every page.
 * Pages that show business details as content use `getStoreSettings`.
 */
export const getStoreChromeSettings = cache(async (): Promise<StoreSettings> => {
  try {
    return await getStoreSettings();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[storefront] GET /settings/public unavailable for the header and footer: ${message}; using contact fallback`);
    return withContactFallback(null);
  }
});
