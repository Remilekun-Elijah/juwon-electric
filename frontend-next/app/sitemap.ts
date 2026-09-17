import type { MetadataRoute } from "next";
import { getPackages, getVacancies } from "@/lib/api/public";
import { isr, readOr } from "@/lib/api/server";
import type { PublicVacancy } from "@/lib/api/types";
import { categoryPath, productPath } from "@/lib/catalog";
import { loadCategories, loadProductPage } from "@/lib/catalog-data";
import { fallbackPackages } from "@/lib/fallbacks";
import { packagePath } from "@/lib/packages";
import { SITE_URL, routes } from "@/lib/site";
import { isOpenVacancy, vacancyPath } from "@/lib/vacancies";

/** Rebuilt at most every 5 minutes, like the pages it lists. */
export const revalidate = 300;

const url = (path: string) => `${SITE_URL}${path === "/" ? "" : path}`;

/** Public pages, packages, open vacancies, product categories and the first 100 products (FE_ACCEPTANCE §C). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [packages, vacancies, categories, products] = await Promise.all([
    readOr("GET /packages (sitemap)", () => getPackages(isr(["packages"])), fallbackPackages, (items) => items.length === 0),
    readOr<PublicVacancy[]>("GET /vacancies (sitemap)", () => getVacancies({}, isr(["vacancies"])), []),
    loadCategories(),
    loadProductPage({ page: 1, limit: 100 }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: url(routes.home), changeFrequency: "weekly", priority: 1 },
    { url: url(routes.packages), changeFrequency: "weekly", priority: 0.9 },
    { url: url(routes.services), changeFrequency: "monthly", priority: 0.8 },
    { url: url(routes.products), changeFrequency: "weekly", priority: 0.8 },
    { url: url(routes.portfolio), changeFrequency: "monthly", priority: 0.7 },
    { url: url(routes.contact), changeFrequency: "yearly", priority: 0.6 },
    { url: url(routes.vacancies), changeFrequency: "weekly", priority: 0.6 },
  ];

  return [
    ...staticPages,
    ...packages.data.map((item) => ({ url: url(packagePath(item)), changeFrequency: "monthly" as const, priority: 0.7 })),
    ...vacancies.data.filter(isOpenVacancy).map((vacancy) => ({
      url: url(vacancyPath(vacancy)),
      lastModified: vacancy.updatedAt ?? vacancy.postedAt ?? undefined,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...categories.map((category) => ({
      url: url(categoryPath(category)),
      lastModified: category.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...products.data.items.map((product) => ({
      url: url(productPath(product)),
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
