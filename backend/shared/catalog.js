// Categories and products (API_CONTRACT_V3 §4, decision D5): validation,
// relationship checks, filters and serializers. Pure: storage lives in each runtime.
import { badRequest, conflict } from "./errors.js";
import {
  OPS_LIMITS,
  boolean,
  idRef,
  imageUrl,
  imageUrlList,
  integer,
  isPlainObject,
  number,
  oneOf,
  paginate,
  queryText,
  slug as slugField,
  sortOrder,
  text,
  textList,
} from "./fields.js";
import { packageProductIds } from "./packagePricing.js";
import { RICH_TEXT_MAX_LENGTH, RICH_TEXT_TOO_LONG_MESSAGE, sanitizeRichText } from "./richText.js";

export const PRODUCT_STATUSES = ["active", "hidden", "archived"];
export const ATTRIBUTE_TYPES = ["text", "number", "boolean"];
export const CURRENCY = "NGN";

const KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const SKU_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

const sent = (body, key) => body !== null && typeof body === "object" && body[key] !== undefined;
const byName = (a, b) => String(a.name).localeCompare(String(b.name)) || String(a.id).localeCompare(String(b.id));

/** Lower-cased SKU, stored as `skuLower` for case-insensitive uniqueness and lookup. */
export const skuKey = (sku) => String(sku ?? "").trim().toLowerCase();

// ---- categories ---------------------------------------------------------------------

const categoryAttributes = (body) => {
  const raw = body.attributes;
  if (raw === null) return [];
  if (!Array.isArray(raw)) throw badRequest("Attributes must be a list.");
  if (raw.length > 30) throw badRequest("A category can have at most 30 attributes.");
  const keys = new Set();
  return raw.map((entry) => {
    if (!isPlainObject(entry)) throw badRequest("Invalid category attribute.");
    const key = text(entry, "key", { label: "Attribute key", required: true, max: 64 });
    if (!KEY_PATTERN.test(key)) {
      throw badRequest("Attribute key must start with a letter and contain only letters, numbers and underscores.");
    }
    if (keys.has(key)) throw badRequest(`Attribute key "${key}" is used more than once.`);
    keys.add(key);
    return {
      key,
      label: text(entry, "label", { label: "Attribute label", required: true, max: 100 }),
      type: oneOf(entry, "type", ATTRIBUTE_TYPES, { label: "Attribute type", required: true }),
      unit: text(entry, "unit", { label: "Attribute unit", max: 20 }) || null,
    };
  });
};

/**
 * Category payload. Create: `name` required, defaults applied. Update (partial): only sent
 * fields are returned; "" or null clears description and imageUrl.
 */
export const categoryPayload = (body, { isUpdate = false } = {}) => {
  const input = isPlainObject(body) ? body : {};
  const payload = {};
  if (!isUpdate || sent(input, "name")) {
    payload.name = text(input, "name", { label: "Name", required: true, max: OPS_LIMITS.categoryName });
  }
  if (sent(input, "slug")) payload.slug = slugField(input);
  if (!isUpdate || sent(input, "parentId")) payload.parentId = idRef(input, "parentId", { label: "Parent category" }) ?? null;
  if (!isUpdate || sent(input, "description")) {
    payload.description = text(input, "description", { label: "Description", max: 1000, multiline: true }) || null;
  }
  if (!isUpdate || sent(input, "imageUrl")) payload.imageUrl = imageUrl(input, "imageUrl", { label: "Image URL" }) || null;
  if (!isUpdate || sent(input, "attributes")) payload.attributes = sent(input, "attributes") ? categoryAttributes(input) : [];
  if (!isUpdate || sent(input, "isActive")) payload.isActive = boolean(input, "isActive", { label: "isActive" }) ?? true;
  if (sent(input, "sortOrder")) payload.sortOrder = sortOrder(input);
  return payload;
};

/** Throws when parentId is unknown, or when it is the category itself or one of its descendants. */
export const assertValidParent = (categories, parentId, selfId = null) => {
  if (!parentId) return;
  const byId = new Map(categories.map((category) => [category.id, category]));
  if (!byId.has(parentId)) throw badRequest("Parent category not found.");
  const seen = new Set();
  for (let cursor = byId.get(parentId); cursor && !seen.has(cursor.id); cursor = byId.get(cursor.parentId)) {
    if (cursor.id === selfId) throw badRequest("A category cannot be its own ancestor.");
    seen.add(cursor.id);
  }
};

/** 409 while subcategories, products or packages (COMMERCE_V3 §4) reference the category. */
export const assertCategoryDeletable = (category, categories, products, packages = []) => {
  const uses = (item) => item.categoryId === category.id;
  if (categories.some((item) => item.parentId === category.id) || products.some(uses) || packages.some(uses)) {
    throw conflict("Category has subcategories, products or packages.");
  }
};

/** Ids of the category and all of its descendants. */
export const categoryAndDescendants = (categories, rootId) => {
  const ids = new Set([rootId]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const category of categories) {
      if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) {
        ids.add(category.id);
        grew = true;
      }
    }
  }
  return ids;
};

export const serializeCategory = (category) => ({
  id: category.id,
  slug: category.slug,
  name: category.name,
  parentId: category.parentId ?? null,
  description: category.description || null,
  imageUrl: category.imageUrl || null,
  attributes: Array.isArray(category.attributes) ? category.attributes : [],
  isActive: category.isActive !== false,
  sortOrder: Number(category.sortOrder) || 0,
  createdAt: category.createdAt ?? null,
  updatedAt: category.updatedAt ?? null,
});

/** Public categories: active only, sortOrder then name. */
export const publicCategories = (categories) =>
  categories
    .filter((category) => category.isActive !== false)
    .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0) || byName(a, b))
    .map(serializeCategory);

// ---- products -------------------------------------------------------------------------

const productAttributes = (body) => {
  const raw = body.attributes;
  if (raw === null) return {};
  if (!isPlainObject(raw)) throw badRequest("Attributes must be an object.");
  const entries = Object.entries(raw);
  if (entries.length > 50) throw badRequest("A product can have at most 50 attributes.");
  const out = {};
  for (const [key, value] of entries) {
    if (!KEY_PATTERN.test(key)) {
      throw badRequest("Attribute key must start with a letter and contain only letters, numbers and underscores.");
    }
    if (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) out[key] = value;
    else if (typeof value === "string") out[key] = text({ value }, "value", { label: `Attribute ${key}`, max: 200 });
    else throw badRequest(`Attribute ${key} must be text, a number or true/false.`);
  }
  return out;
};

const skuField = (body) => {
  const value = text(body, "sku", { label: "SKU", required: true, max: OPS_LIMITS.sku });
  if (!SKU_PATTERN.test(value)) throw badRequest("SKU may only contain letters, numbers, dots, dashes and underscores.");
  return value;
};

// Same rules as vacancy descriptions (shared/vacancies.js on BE-1): null or absent is "",
// anything else must be text; the sanitiser is the boundary, so control characters are
// dropped by it rather than rejected.
const descriptionHtmlField = (body) => {
  const raw = body.descriptionHtml;
  if (raw === undefined || raw === null) return "";
  if (typeof raw !== "string") throw badRequest("Description must be text.");
  const clean = sanitizeRichText(raw).trim();
  if (clean.length > RICH_TEXT_MAX_LENGTH) throw badRequest(RICH_TEXT_TOO_LONG_MESSAGE);
  return clean;
};

/**
 * Product payload. Create: sku, name and price required; defaults applied (reorderLevel
 * from `defaultReorderLevel`). Update (partial): only sent fields are returned. Stock only
 * changes through inventory adjustments: a PUT stockQuantity that differs from the stored
 * value is rejected, and the same value is ignored.
 */
export const productPayload = (body, { existing = null, defaultReorderLevel = 0 } = {}) => {
  const input = isPlainObject(body) ? body : {};
  const isUpdate = Boolean(existing);
  const has = (key) => !isUpdate || sent(input, key);
  const payload = {};

  if (has("sku")) {
    payload.sku = skuField(input);
    payload.skuLower = skuKey(payload.sku);
  }
  if (has("name")) payload.name = text(input, "name", { label: "Name", required: true, max: OPS_LIMITS.productName });
  if (sent(input, "slug")) payload.slug = slugField(input);
  if (has("categoryId")) payload.categoryId = idRef(input, "categoryId", { label: "Category" }) ?? null;
  if (has("brand")) payload.brand = text(input, "brand", { label: "Brand", max: OPS_LIMITS.brand }) || null;
  if (has("descriptionHtml")) payload.descriptionHtml = descriptionHtmlField(input);
  if (has("attributes")) payload.attributes = sent(input, "attributes") ? productAttributes(input) : {};
  if (has("price")) {
    const price = number(input, "price", { label: "Price", required: true });
    if (!(price > 0) || price > 1_000_000_000) throw badRequest("Price must be greater than 0 and at most 1,000,000,000.");
    payload.price = price;
  }
  if (has("costPrice")) {
    const costPrice = number(input, "costPrice", { label: "Cost price" });
    if (costPrice !== undefined && (costPrice < 0 || costPrice > 1_000_000_000)) {
      throw badRequest("Cost price must be between 0 and 1,000,000,000.");
    }
    payload.costPrice = costPrice ?? null;
  }
  if (sent(input, "currency") && input.currency !== null && input.currency !== CURRENCY) {
    throw badRequest(`Currency must be ${CURRENCY}.`);
  }
  if (!isUpdate) payload.currency = CURRENCY;
  if (has("reorderLevel")) {
    payload.reorderLevel =
      integer(input, "reorderLevel", { label: "Reorder level", min: 0, max: 1_000_000 }) ?? defaultReorderLevel;
  }
  if (has("images")) payload.images = imageUrlList(input, "images", { label: "Images", max: 10 }) ?? [];
  if (has("status")) payload.status = oneOf(input, "status", PRODUCT_STATUSES, { label: "Status" }) ?? "active";
  if (has("tags")) payload.tags = textList(input, "tags", { label: "Tags", max: 20, itemMax: 50 }) ?? [];

  const stock = integer(input, "stockQuantity", { label: "Stock quantity", min: 0, max: 1_000_000 });
  if (!isUpdate) payload.stockQuantity = stock ?? 0;
  else if (stock !== undefined && stock !== Number(existing.stockQuantity || 0)) {
    throw badRequest("Use an inventory adjustment to change stock.");
  }

  // The records table filters public lists on isActive; it mirrors status === "active".
  if (payload.status !== undefined) payload.isActive = payload.status === "active";
  return payload;
};

/**
 * Battery type for a package (2026-09-18: the admin sets a catalogue category instead). It is still stored and
 * returned for the classic Vite site, which groups packages by it: the sent value wins, then the category name
 * ("Hybrid …" → "hybrid lithium", "…lithium" → "lithium", "…tubular" → "tubular"), then what the package already had.
 */
export const packageTypeFor = ({ sent, categoryName, existing } = {}) => {
  const clean = typeof sent === "string" ? sent.trim().toLowerCase() : "";
  if (clean) return clean;
  const name = String(categoryName || "").toLowerCase();
  if (name.includes("hybrid")) return "hybrid lithium";
  if (name.includes("lithium")) return "lithium";
  if (name.includes("tubular")) return "tubular";
  const stored = typeof existing === "string" ? existing.trim().toLowerCase() : "";
  return stored || "hybrid lithium";
};

export const assertCategoryExists = (categories, categoryId) => {
  if (categoryId && !categories.some((category) => category.id === categoryId)) {
    throw badRequest("Category not found.");
  }
};

export const skuConflict = (sku) => conflict(`Another product already uses SKU ${sku}.`);

export const assertSkuFree = (products, sku, selfId = null) => {
  const key = skuKey(sku);
  if (products.some((product) => product.id !== selfId && skuKey(product.sku) === key)) throw skuConflict(sku);
};

/** 409 when any package option (or deprecated top-level item list) uses the product. */
export const assertProductDeletable = (product, packages) => {
  if (packages.some((pack) => packageProductIds(pack).has(product.id))) throw conflict("Product is used by a package.");
};

/** GET /packages?category=<id|slug> (COMMERCE_V3 §4): active categories and their descendants; unknown -> []. */
export const packagesInCategory = (packages, categories, query) => {
  const inCategory = categoryFilter(categories, queryText(query, "category"), { activeOnly: true });
  return inCategory ? packages.filter(inCategory) : [];
};

export const isLowStockProduct = (product) =>
  (Number(product.stockQuantity) || 0) <= (Number(product.reorderLevel) || 0);

export const serializeProduct = (product) => ({
  id: product.id,
  sku: product.sku,
  slug: product.slug,
  name: product.name,
  categoryId: product.categoryId ?? null,
  brand: product.brand || null,
  descriptionHtml: product.descriptionHtml || "",
  attributes: isPlainObject(product.attributes) ? product.attributes : {},
  price: Number(product.price) || 0,
  costPrice: product.costPrice ?? null,
  currency: CURRENCY,
  stockQuantity: Number(product.stockQuantity) || 0,
  reorderLevel: Number(product.reorderLevel) || 0,
  lowStock: isLowStockProduct(product),
  images: Array.isArray(product.images) ? product.images : [],
  status: product.status || "active",
  tags: Array.isArray(product.tags) ? product.tags : [],
  createdAt: product.createdAt ?? null,
  updatedAt: product.updatedAt ?? null,
});

export const serializePublicProduct = (product, categoriesById = new Map()) => {
  const { costPrice: _costPrice, stockQuantity, reorderLevel: _reorderLevel, lowStock: _lowStock, ...rest } = serializeProduct(product);
  const category = rest.categoryId ? categoriesById.get(rest.categoryId) : null;
  return {
    ...rest,
    inStock: stockQuantity > 0,
    category: category && category.isActive !== false ? { id: category.id, slug: category.slug, name: category.name } : null,
  };
};

export const isPublicProduct = (product) => Boolean(product) && (product.status || "active") === "active";

const matchesQuery = (product, q) => {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [product.name, product.sku, product.brand, ...(Array.isArray(product.tags) ? product.tags : [])].some((value) =>
    String(value ?? "").toLowerCase().includes(needle)
  );
};

/**
 * Category filter over records with `categoryId` (products, packages): id or slug, including
 * descendants. Matches everything without a key; null when the category is unknown.
 */
export const categoryFilter = (categories, key, { activeOnly }) => {
  if (!key) return () => true;
  const pool = activeOnly ? categories.filter((item) => item.isActive !== false) : categories;
  const category = pool.find((item) => item.id === key || item.slug === key);
  if (!category) return null;
  const ids = categoryAndDescendants(pool, category.id);
  return (product) => Boolean(product.categoryId) && ids.has(product.categoryId);
};

export const STOCK_FILTERS = ["all", "low", "out"];

const stockFilter = (query) => {
  const stock = queryText(query, "stock");
  if (stock && !STOCK_FILTERS.includes(stock)) throw badRequest("stock must be one of: all, low, out.");
  if (stock === "low") return isLowStockProduct;
  if (stock === "out") return (product) => (Number(product.stockQuantity) || 0) <= 0;
  return () => true;
};

/**
 * GET /products: active products, `category` (unknown -> empty page) and `q`, name order.
 * Returns the paged data; `page` = { page, limit } already validated.
 */
export const publicProductPage = (products, categories, query, page) => {
  const inCategory = categoryFilter(categories, queryText(query, "category"), { activeOnly: true });
  const q = queryText(query, "q");
  const byId = new Map(categories.map((category) => [category.id, category]));
  const items = inCategory
    ? products.filter((product) => isPublicProduct(product) && inCategory(product) && matchesQuery(product, q)).sort(byName)
    : [];
  const paged = paginate(items, page);
  return { ...paged, items: paged.items.map((product) => serializePublicProduct(product, byId)) };
};

const byUpdatedDesc = (a, b) =>
  String(b.updatedAt).localeCompare(String(a.updatedAt)) || byName(a, b);

/** GET /admin/products: every product, filters category/status/stock/q, updatedAt desc. */
export const adminProductPage = (products, categories, query, page) => {
  const inCategory = categoryFilter(categories, queryText(query, "category"), { activeOnly: false });
  const status = queryText(query, "status");
  if (status && !PRODUCT_STATUSES.includes(status)) throw badRequest("status must be one of: active, hidden, archived.");
  const inStock = stockFilter(query);
  const q = queryText(query, "q");
  const items = inCategory
    ? products
        .filter((product) => inCategory(product) && (!status || (product.status || "active") === status) && inStock(product) && matchesQuery(product, q))
        .sort(byUpdatedDesc)
    : [];
  const paged = paginate(items, page);
  return { ...paged, items: paged.items.map(serializeProduct) };
};

/** GET /admin/inventory rows: low stock first, then name. */
export const inventoryPage = (products, categories, query, page) => {
  const inCategory = categoryFilter(categories, queryText(query, "category"), { activeOnly: false });
  const inStock = stockFilter(query);
  const q = queryText(query, "q");
  const items = inCategory
    ? products
        .filter((product) => inCategory(product) && inStock(product) && matchesQuery(product, q))
        .sort((a, b) => Number(isLowStockProduct(b)) - Number(isLowStockProduct(a)) || byName(a, b))
    : [];
  const paged = paginate(items, page);
  return {
    ...paged,
    items: paged.items.map((product) => ({
      productId: product.id,
      sku: product.sku,
      name: product.name,
      categoryId: product.categoryId ?? null,
      stockQuantity: Number(product.stockQuantity) || 0,
      reorderLevel: Number(product.reorderLevel) || 0,
      lowStock: isLowStockProduct(product),
      status: product.status || "active",
      updatedAt: product.updatedAt ?? null,
    })),
  };
};
