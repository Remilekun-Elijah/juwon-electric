import type { Category, CategoryAttribute, Paged, PublicProduct } from "@/lib/api/types";
import { getAmount } from "@/lib/format";
import { routes } from "@/lib/site";

/** Products per catalogue page. The contract caps `limit` at 100. */
export const PRODUCTS_PER_PAGE = 24;
/** Category pages list up to the contract maximum in one request. */
export const CATEGORY_PRODUCT_LIMIT = 100;
/** Pages pre-rendered at build; later pages render on first request (ISR). */
export const PRERENDERED_PRODUCT_PAGES = 10;

export const emptyPage = (limit = PRODUCTS_PER_PAGE): Paged<PublicProduct> => ({ items: [], page: 1, limit, total: 0 });

export const productPath = (product: Pick<PublicProduct, "slug" | "id">) =>
  `${routes.products}/${encodeURIComponent(product.slug || product.id)}`;

export const categoryPath = (category: Pick<Category, "slug" | "id">) =>
  `${routes.products}/category/${encodeURIComponent(category.slug || category.id)}`;

/** Page 1 is `/products`; later pages are `/products/page/[page]`. */
export const productsPagePath = (page: number) => (page <= 1 ? routes.products : `${routes.products}/page/${page}`);

export const totalPages = (page: Pick<Paged<unknown>, "total" | "limit">) =>
  Math.max(1, Math.ceil(page.total / Math.max(1, page.limit)));

export const formatPrice = (price: number) => `₦${getAmount(price)}`;

export type CategoryNode = Category & { children: CategoryNode[] };

/** Builds the category tree from the flat `GET /categories` array (contract §4.1), keeping API order. */
export function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const nodes = new Map<string, CategoryNode>(categories.map((category) => [category.id, { ...category, children: [] }]));
  const roots: CategoryNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent && parent !== node) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

/** Root → … → category, for breadcrumbs. Stops on cycles. */
export function categoryTrail(categories: Category[], categoryId: string | null | undefined): Category[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const trail: Category[] = [];
  const seen = new Set<string>();
  let current = categoryId ? byId.get(categoryId) : undefined;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    trail.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return trail;
}

/** Resolves a category by slug or id from the flat list. */
export const findCategory = (categories: Category[], slugOrId: string) =>
  categories.find((category) => category.slug === slugOrId) ?? categories.find((category) => category.id === slugOrId);

/**
 * Product attributes as label/value rows, using the category's attribute schema for labels, units and order.
 * Keys without a schema entry are shown with a humanised key.
 */
export function attributeRows(
  attributes: PublicProduct["attributes"],
  schema: CategoryAttribute[] = []
): { key: string; label: string; value: string }[] {
  const format = (value: string | number | boolean, definition?: CategoryAttribute) => {
    if (typeof value === "boolean" || definition?.type === "boolean") return value === true || value === "true" ? "Yes" : "No";
    const text = typeof value === "number" ? new Intl.NumberFormat("en-NG").format(value) : String(value);
    return definition?.unit ? `${text} ${definition.unit}` : text;
  };
  const humanise = (key: string) => key.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^\w/, (c) => c.toUpperCase());

  const rows: { key: string; label: string; value: string }[] = [];
  const used = new Set<string>();
  for (const definition of schema) {
    if (!(definition.key in attributes)) continue;
    used.add(definition.key);
    rows.push({ key: definition.key, label: definition.label, value: format(attributes[definition.key], definition) });
  }
  for (const [key, value] of Object.entries(attributes)) {
    if (used.has(key)) continue;
    rows.push({ key, label: humanise(key), value: format(value) });
  }
  return rows;
}
