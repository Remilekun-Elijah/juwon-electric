// Categories and products (PRD §6.1, decision D5): payload validation, relationship
// checks and public serializers. Storage lives in each runtime; everything here is pure.
import { badRequest, conflict } from "./errors.js";
import {
  OPS_LIMITS,
  boolean,
  idRef,
  integer,
  isPlainObject,
  number,
  oneOf,
  slug as slugField,
  sortOrder,
  text,
  textList,
  url,
  urlList,
} from "./fields.js";
import { sanitizeHtml } from "./sanitizeHtml.js";

export const PRODUCT_STATUSES = ["active", "hidden", "archived"];
export const CURRENCY = "NGN";

const SKU_PATTERN = /^[A-Z0-9][A-Z0-9._-]*$/;

export const normalizeSku = (value) => String(value ?? "").trim().toUpperCase();

// ---- categories ---------------------------------------------------------------

/**
 * Category payload. Create: required fields enforced, defaults applied. Update: absent
 * optional fields are undefined (not written); null clears parentId/description/imageUrl.
 */
export const categoryPayload = (body, { existing = null } = {}) => {
  const isUpdate = Boolean(existing);
  const name = text(body, "name", { label: "Name", required: true, max: OPS_LIMITS.categoryName });
  const parentId = idRef(body, "parentId", { label: "Parent category" });
  const description = text(body, "description", {
    label: "Description",
    max: OPS_LIMITS.description,
    multiline: true,
  });
  const imageUrl = url(body, "imageUrl", { label: "Image URL" });
  const isActive = boolean(body, "isActive", { label: "isActive" });
  const order = sortOrder(body);
  const slug = slugField(body);

  // Sent (including null or "") is written; absent keeps the stored value on update.
  const clearable = (key, value) => (body?.[key] !== undefined ? value : isUpdate ? undefined : "");

  return {
    name,
    slug,
    parentId: parentId === undefined ? (isUpdate ? undefined : null) : parentId,
    description: clearable("description", description),
    imageUrl: clearable("imageUrl", imageUrl),
    isActive: isActive ?? (isUpdate ? undefined : true),
    sortOrder: order,
  };
};

/** Throws when parentId is unknown, the category itself, or one of its descendants. */
export const assertValidParent = (categories, parentId, selfId = null) => {
  if (!parentId) return;
  const byId = new Map(categories.map((category) => [category.id, category]));
  if (!byId.has(parentId)) throw badRequest("Parent category not found.");
  if (selfId && parentId === selfId) throw badRequest("A category cannot be its own parent.");
  let cursor = byId.get(parentId);
  const seen = new Set();
  while (cursor && cursor.parentId && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    if (cursor.parentId === selfId) throw badRequest("A category cannot be moved under its own subcategory.");
    cursor = byId.get(cursor.parentId);
  }
};

export const assertCategoryDeletable = (category, categories, products) => {
  if (categories.some((item) => item.parentId === category.id)) {
    throw conflict("This category has subcategories. Move or delete them first.");
  }
  const used = products.filter((product) => product.categoryId === category.id).length;
  if (used > 0) {
    throw conflict(`This category is used by ${used} ${used === 1 ? "product" : "products"}. Move them first.`);
  }
};

/** Ids of the category and all of its descendants. */
export const categoryAndDescendants = (categories, rootId) => {
  const ids = new Set([rootId]);
  let grew = true;
  while (grew) {
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

export const serializePublicCategory = (category) => ({
  id: category.id,
  name: category.name,
  slug: category.slug,
  parentId: category.parentId ?? null,
  description: category.description || "",
  imageUrl: category.imageUrl || "",
  sortOrder: category.sortOrder ?? 0,
});

// ---- products -------------------------------------------------------------------

const attributesField = (body) => {
  const raw = body?.attributes;
  if (raw === undefined) return undefined;
  if (raw === null) return {};
  if (!isPlainObject(raw)) throw badRequest("Attributes must be an object of name/value pairs.");
  const entries = Object.entries(raw);
  if (entries.length > OPS_LIMITS.attributeCount) {
    throw badRequest(`A product can have at most ${OPS_LIMITS.attributeCount} attributes.`);
  }
  const out = {};
  for (const [rawKey, rawValue] of entries) {
    const key = text({ key: rawKey }, "key", {
      label: "Attribute name",
      required: true,
      max: OPS_LIMITS.attributeKey,
    });
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      throw badRequest("Attribute name is not allowed.");
    }
    if (typeof rawValue === "number" || typeof rawValue === "boolean") {
      if (typeof rawValue === "number" && !Number.isFinite(rawValue)) {
        throw badRequest("Attribute values must be text, numbers or true/false.");
      }
      out[key] = String(rawValue);
    } else if (typeof rawValue === "string") {
      out[key] = text({ value: rawValue }, "value", { label: `Attribute "${key}"`, max: OPS_LIMITS.attributeValue });
    } else {
      throw badRequest("Attribute values must be text, numbers or true/false.");
    }
  }
  return out;
};

const skuField = (body) => {
  const value = normalizeSku(text(body, "sku", { label: "SKU", required: true, max: OPS_LIMITS.sku }));
  if (!SKU_PATTERN.test(value)) {
    throw badRequest("SKU may only contain letters, numbers, dots, dashes and underscores.");
  }
  return value;
};

/**
 * Product payload. Create applies defaults; update leaves absent optional fields
 * undefined. Stock only changes through stock adjustments: on update a stockQuantity
 * different from the stored one is rejected.
 */
export const productPayload = (body, { existing = null } = {}) => {
  const isUpdate = Boolean(existing);
  const sku = skuField(body);
  const name = text(body, "name", { label: "Name", required: true, max: OPS_LIMITS.productName });
  const slug = slugField(body);
  const categoryId = idRef(body, "categoryId", { label: "Category" });
  const brand = text(body, "brand", { label: "Brand", max: OPS_LIMITS.brand });
  const rawHtml = text(body, "descriptionHtml", {
    label: "Description",
    max: OPS_LIMITS.descriptionHtml,
    multiline: true,
  });
  const attributes = attributesField(body);
  const price = number(body, "price", { label: "Price", required: !isUpdate, min: 0, max: OPS_LIMITS.moneyMax });
  const costPrice = number(body, "costPrice", { label: "Cost price", min: 0, max: OPS_LIMITS.moneyMax });
  const currency = text(body, "currency", { label: "Currency", max: 3 }).toUpperCase();
  if (currency && currency !== CURRENCY) throw badRequest(`Currency must be ${CURRENCY}.`);
  const stockQuantity = integer(body, "stockQuantity", {
    label: "Stock quantity",
    min: 0,
    max: OPS_LIMITS.stockMax,
  });
  if (isUpdate && stockQuantity !== undefined && stockQuantity !== Number(existing.stockQuantity || 0)) {
    throw badRequest("Use a stock adjustment to change the stock quantity.");
  }
  const reorderLevel = integer(body, "reorderLevel", { label: "Reorder level", min: 0, max: OPS_LIMITS.stockMax });
  const images = urlList(body, "images", { label: "Images", max: OPS_LIMITS.images });
  const status = oneOf(body, "status", PRODUCT_STATUSES, { label: "Status" });
  const tags = textList(body, "tags", { label: "Tags", max: OPS_LIMITS.tags, itemMax: OPS_LIMITS.tag });
  const order = sortOrder(body);

  const nextStatus = status ?? (isUpdate ? undefined : "active");
  const sent = (key) => body?.[key] !== undefined;

  return {
    sku,
    name,
    slug,
    categoryId: categoryId === undefined ? (isUpdate ? undefined : null) : categoryId,
    brand: sent("brand") ? brand : isUpdate ? undefined : "",
    descriptionHtml: sent("descriptionHtml") ? sanitizeHtml(rawHtml) : isUpdate ? undefined : "",
    attributes: attributes ?? (isUpdate ? undefined : {}),
    price,
    costPrice: sent("costPrice") ? costPrice ?? null : isUpdate ? undefined : null,
    currency: isUpdate ? undefined : CURRENCY,
    stockQuantity: isUpdate ? undefined : stockQuantity ?? 0,
    // null means "use the default reorder level from settings".
    reorderLevel: sent("reorderLevel") ? reorderLevel ?? null : isUpdate ? undefined : null,
    images: images ?? (isUpdate ? undefined : []),
    status: nextStatus,
    // The records table filters public lists on isActive; it mirrors status === "active".
    isActive: nextStatus === undefined ? undefined : nextStatus === "active",
    tags: tags ?? (isUpdate ? undefined : []),
    sortOrder: order,
  };
};

export const assertCategoryExists = (categories, categoryId) => {
  if (categoryId && !categories.some((category) => category.id === categoryId)) {
    throw badRequest("Category not found.");
  }
};

export const skuConflict = (sku) => conflict(`Another product already uses SKU ${sku}.`);

export const assertSkuFree = (products, sku, selfId = null) => {
  if (products.some((product) => product.id !== selfId && normalizeSku(product.sku) === sku)) {
    throw skuConflict(sku);
  }
};

/** Packages whose components reference the product. */
export const packagesUsingProduct = (packages, productId) =>
  packages.filter(
    (pack) => Array.isArray(pack.components) && pack.components.some((component) => component?.productId === productId)
  );

export const assertProductDeletable = (product, packages) => {
  const used = packagesUsingProduct(packages, product.id).length;
  if (used > 0) {
    throw conflict(
      `This product is a component of ${used} ${used === 1 ? "package" : "packages"}. Remove it from them first, or archive the product.`
    );
  }
};

export const serializePublicProduct = (product, categoriesById = new Map()) => {
  const category = product.categoryId ? categoriesById.get(product.categoryId) : null;
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    slug: product.slug,
    categoryId: product.categoryId ?? null,
    category:
      category && category.isActive !== false
        ? { id: category.id, name: category.name, slug: category.slug }
        : null,
    brand: product.brand || "",
    descriptionHtml: product.descriptionHtml || "",
    attributes: product.attributes || {},
    price: Number(product.price) || 0,
    currency: product.currency || CURRENCY,
    images: Array.isArray(product.images) ? product.images : [],
    tags: Array.isArray(product.tags) ? product.tags : [],
    inStock: Number(product.stockQuantity) > 0,
    sortOrder: product.sortOrder ?? 0,
  };
};

export const isPublicProduct = (product) => product && product.status === "active" && product.isActive !== false;

/**
 * Public product list: active products, optionally limited to a category (id or slug)
 * and its active descendants. Unknown or inactive category: 404 message returned as null.
 */
export const filterPublicProducts = (products, categories, categoryKey) => {
  const visible = products.filter(isPublicProduct);
  if (!categoryKey) return visible;
  const category = categories.find(
    (item) => item.isActive !== false && (item.id === categoryKey || item.slug === categoryKey)
  );
  if (!category) return null;
  const active = categories.filter((item) => item.isActive !== false);
  const ids = categoryAndDescendants(active, category.id);
  return visible.filter((product) => product.categoryId && ids.has(product.categoryId));
};

// ---- package components (packages reference products) ----------------------------

/**
 * components: [{ productId, quantity }] on packages. Undefined when absent; null or []
 * clears. Duplicate product ids are merged.
 */
export const componentsField = (body) => {
  const raw = body?.components;
  if (raw === undefined) return undefined;
  if (raw === null) return [];
  if (!Array.isArray(raw)) throw badRequest("Components must be a list.");
  if (raw.length > OPS_LIMITS.components) {
    throw badRequest(`A package can have at most ${OPS_LIMITS.components} components.`);
  }
  const merged = new Map();
  for (const entry of raw) {
    if (!isPlainObject(entry)) throw badRequest("Invalid package component.");
    const productId = text(entry, "productId", { label: "Component product", required: true, max: OPS_LIMITS.id });
    const quantity =
      integer(entry, "quantity", { label: "Component quantity", min: 1, max: OPS_LIMITS.componentQuantityMax }) ?? 1;
    merged.set(productId, Math.min((merged.get(productId) || 0) + quantity, OPS_LIMITS.componentQuantityMax));
  }
  return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
};

export const assertComponentsExist = (components, products) => {
  if (!components?.length) return;
  const ids = new Set(products.map((product) => product.id));
  const missing = components.find((component) => !ids.has(component.productId));
  if (missing) throw badRequest("Component product not found.");
};
