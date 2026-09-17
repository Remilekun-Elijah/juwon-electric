/**
 * Server-side catalogue reads with fallbacks (contract §4). Until BE-2's endpoints are deployed they answer 404
 * "Route not found."; pages then render an empty catalogue instead of failing the build.
 */
import { getCategories, getProducts, type ProductQuery } from "@/lib/api/public";
import { isr, readOr } from "@/lib/api/server";
import type { Category } from "@/lib/api/types";
import { PRODUCTS_PER_PAGE, emptyPage } from "./catalog";

export const loadCategories = () =>
  readOr<Category[]>("GET /categories", () => getCategories(isr(["categories"])), []).then((result) =>
    result.data.filter((category) => category.isActive !== false)
  );

export const loadProductPage = (query: ProductQuery = {}) => {
  const limit = query.limit ?? PRODUCTS_PER_PAGE;
  const params = { ...query, limit };
  const label = `GET /products?${new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)]))}`;
  return readOr(label, () => getProducts(params, isr(["products"])), emptyPage(limit));
};
