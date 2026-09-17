// Categories and products (API_CONTRACT_V3 §4) for the Worker, at parity with
// backend/controllers/catalog.js. Validation, filters and serializers: backend/shared/catalog.js.
import { created, ok } from "../http.js";
import {
  createCollectionItem,
  deleteCollectionItem,
  findByField,
  getCollectionItem,
  listCollection,
  resolveSlug,
  updateCollectionItem,
} from "../store.js";
import { changedFields, providedFields } from "../audit.js";
import { requireCapability } from "../capabilities.js";
import { getSettings, recordInitialStock } from "./inventory.js";
import {
  adminProductPage,
  assertCategoryDeletable,
  assertCategoryExists,
  assertProductDeletable,
  assertValidParent,
  categoryPayload,
  isPublicProduct,
  productPayload,
  publicCategories,
  publicProductPage,
  serializeCategory,
  serializeProduct,
  serializePublicProduct,
  skuConflict,
} from "../../../shared/catalog.js";
import { notFoundFor } from "../../../shared/errors.js";
import { pageParams } from "../../../shared/fields.js";

export const idAfter = (path, prefix) => {
  if (!path.startsWith(`${prefix}/`)) return null;
  const id = path.slice(prefix.length + 1);
  return id && !id.includes("/") ? id : null;
};

export const queryOf = (url) => Object.fromEntries(url.searchParams);

const all = (env, collection) => listCollection(env, collection, { includeInactive: true });

/** Product by id, slug, or case-insensitive SKU (API_CONTRACT_V3 §0.4). */
export const getProductItem = async (env, key) => {
  try {
    return await getCollectionItem(env, "products", key);
  } catch (error) {
    if (error?.statusCode !== 404) throw error;
    const bySku = await findByField(env, "products", "skuLower", String(key ?? "").trim().toLowerCase());
    if (!bySku) throw error;
    return bySku;
  }
};

// ---- public -----------------------------------------------------------------------------

export const handleCatalogPublic = async ({ request, env, path, url }) => {
  if (request.method !== "GET") return null;

  if (path === "/categories") return ok("Categories retrieved.", publicCategories(await all(env, "categories")));

  const categoryId = idAfter(path, "/categories");
  if (categoryId) {
    const category = await getCollectionItem(env, "categories", categoryId);
    if (category.isActive === false) throw notFoundFor("categories");
    return ok("Category retrieved.", serializeCategory(category));
  }

  if (path === "/products") {
    const query = queryOf(url);
    const page = pageParams(query);
    const [products, categories] = await Promise.all([all(env, "products"), all(env, "categories")]);
    return ok("Products retrieved.", publicProductPage(products, categories, query, page));
  }

  const productId = idAfter(path, "/products");
  if (productId) {
    const product = await getCollectionItem(env, "products", productId);
    if (!isPublicProduct(product)) throw notFoundFor("products");
    const categories = product.categoryId ? await all(env, "categories") : [];
    return ok("Product retrieved.", serializePublicProduct(product, new Map(categories.map((item) => [item.id, item]))));
  }
  return null;
};

// ---- admin ------------------------------------------------------------------------------

const assertSkuUnique = async (env, sku, selfId = null) => {
  const clash = await findByField(env, "products", "skuLower", sku.toLowerCase());
  if (clash && clash.id !== selfId) throw skuConflict(sku);
};

// Slug on update: a sent slug is made unique; otherwise the stored slug is kept (derived
// only when the record has none).
const updateSlug = async (env, collection, payload, existing) => {
  if (!payload.slug && existing.slug) return undefined;
  return resolveSlug(env, collection, { input: payload.slug, fallback: payload.name || existing.name, excludeId: existing.id });
};

const auditKeys = (keys) => keys.filter((key) => key !== "skuLower");

export const handleCatalogAdmin = async (context) => {
  const { request, env, path, body, admin, audit, url } = context;
  const { method } = request;

  // Categories
  if (path === "/admin/categories" && method === "GET") {
    requireCapability(admin, "products:read");
    return ok("Categories retrieved.", (await all(env, "categories")).map(serializeCategory));
  }
  if (path === "/admin/categories" && method === "POST") {
    requireCapability(admin, "products:write");
    const payload = categoryPayload(body);
    assertValidParent(await all(env, "categories"), payload.parentId);
    const item = await createCollectionItem(env, "categories", payload, { slugFallback: payload.name });
    audit({ action: "category.create", entity: "category", entityId: item.id, summary: `Created category "${item.name}"`, changes: providedFields(payload) });
    return created("Category created.", serializeCategory(item));
  }
  const categoryId = idAfter(path, "/admin/categories");
  if (categoryId && method === "PUT") {
    requireCapability(admin, "products:write");
    const existing = await getCollectionItem(env, "categories", categoryId);
    const payload = categoryPayload(body, { isUpdate: true });
    if (payload.parentId !== undefined) assertValidParent(await all(env, "categories"), payload.parentId, existing.id);
    const patch = { ...payload, slug: await updateSlug(env, "categories", payload, existing) };
    const item = await updateCollectionItem(env, "categories", existing.id, patch);
    audit({ action: "category.update", entity: "category", entityId: item.id, summary: `Updated category "${item.name}"`, changes: changedFields(existing, patch) });
    return ok("Category updated.", serializeCategory(item));
  }
  if (categoryId && method === "DELETE") {
    requireCapability(admin, "products:write");
    const existing = await getCollectionItem(env, "categories", categoryId);
    const [categories, products] = await Promise.all([all(env, "categories"), all(env, "products")]);
    assertCategoryDeletable(existing, categories, products);
    await deleteCollectionItem(env, "categories", existing);
    audit({ action: "category.delete", entity: "category", entityId: existing.id, summary: `Deleted category "${existing.name}"` });
    return ok("Category deleted.", serializeCategory(existing));
  }

  // Products
  if (path === "/admin/products" && method === "GET") {
    requireCapability(admin, "products:read");
    const query = queryOf(url);
    const page = pageParams(query);
    const [products, categories] = await Promise.all([all(env, "products"), all(env, "categories")]);
    return ok("Products retrieved.", adminProductPage(products, categories, query, page));
  }
  if (path === "/admin/products" && method === "POST") {
    requireCapability(admin, "products:write");
    const settings = await getSettings(env);
    const payload = productPayload(body, { defaultReorderLevel: settings.inventory.defaultReorderLevel });
    assertCategoryExists(await all(env, "categories"), payload.categoryId);
    await assertSkuUnique(env, payload.sku);
    // Stock only changes through movements: the initial quantity is an "initial" movement.
    const newProduct = await createCollectionItem(env, "products", { ...payload, stockQuantity: 0 }, { slugFallback: payload.name });
    const item = payload.stockQuantity > 0 ? await recordInitialStock(context, newProduct, payload.stockQuantity) : newProduct;
    audit({ action: "product.create", entity: "product", entityId: item.id, summary: `Created product "${item.name}"`, changes: auditKeys(providedFields(payload)) });
    return created("Product created.", serializeProduct(item));
  }
  const productId = idAfter(path, "/admin/products");
  if (productId && method === "GET") {
    requireCapability(admin, "products:read");
    return ok("Product retrieved.", serializeProduct(await getProductItem(env, productId)));
  }
  if (productId && method === "PUT") {
    requireCapability(admin, "products:write");
    const existing = await getProductItem(env, productId);
    const payload = productPayload(body, { existing });
    if (payload.categoryId) assertCategoryExists(await all(env, "categories"), payload.categoryId);
    if (payload.sku !== undefined) await assertSkuUnique(env, payload.sku, existing.id);
    const patch = { ...payload, slug: await updateSlug(env, "products", payload, existing) };
    // The patch never contains stockQuantity, so a concurrent adjustment is not overwritten.
    const item = await updateCollectionItem(env, "products", existing.id, patch);
    audit({ action: "product.update", entity: "product", entityId: item.id, summary: `Updated product "${item.name}"`, changes: auditKeys(changedFields(existing, patch)) });
    return ok("Product updated.", serializeProduct(item));
  }
  if (productId && method === "DELETE") {
    requireCapability(admin, "products:write");
    const existing = await getProductItem(env, productId);
    assertProductDeletable(existing, await all(env, "packages"));
    await deleteCollectionItem(env, "products", existing);
    audit({ action: "product.delete", entity: "product", entityId: existing.id, summary: `Deleted product "${existing.name}"` });
    return ok("Product deleted.", serializeProduct(existing));
  }

  return null;
};
