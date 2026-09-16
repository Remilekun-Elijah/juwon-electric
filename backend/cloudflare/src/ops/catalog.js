// Categories and products (PRD §6.1) for the Worker, at parity with
// backend/controllers/catalog.js. Validation and serializers: backend/shared/catalog.js.
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
import { requireCapability } from "../capabilities.shim.js";
import {
  assertCategoryDeletable,
  assertCategoryExists,
  assertProductDeletable,
  assertValidParent,
  categoryPayload,
  filterPublicProducts,
  isPublicProduct,
  productPayload,
  serializePublicCategory,
  serializePublicProduct,
  skuConflict,
} from "../../../shared/catalog.js";
import { notFoundFor } from "../../../shared/errors.js";
import { queryText } from "../../../shared/fields.js";

export const idAfter = (path, prefix) => {
  if (!path.startsWith(`${prefix}/`)) return null;
  const id = path.slice(prefix.length + 1);
  return id && !id.includes("/") ? id : null;
};

const all = (env, collection) => listCollection(env, collection, { includeInactive: true });
const queryOf = (url) => Object.fromEntries(url.searchParams);

// ---- public -----------------------------------------------------------------------

export const handleCatalogPublic = async ({ request, env, path, url }) => {
  if (request.method !== "GET") return null;

  if (path === "/categories") {
    const categories = await listCollection(env, "categories");
    return ok("Categories retrieved.", categories.map(serializePublicCategory));
  }
  const categoryId = idAfter(path, "/categories");
  if (categoryId) {
    const category = await getCollectionItem(env, "categories", categoryId);
    if (category.isActive === false) throw notFoundFor("categories");
    return ok("Category retrieved.", serializePublicCategory(category));
  }

  if (path === "/products") {
    const [products, categories] = await Promise.all([listCollection(env, "products"), all(env, "categories")]);
    const filtered = filterPublicProducts(products, categories, queryText(queryOf(url), "category"));
    if (!filtered) throw notFoundFor("categories");
    const byId = new Map(categories.map((category) => [category.id, category]));
    return ok("Products retrieved.", filtered.map((product) => serializePublicProduct(product, byId)));
  }
  const productId = idAfter(path, "/products");
  if (productId) {
    const product = await getCollectionItem(env, "products", productId);
    if (!isPublicProduct(product)) throw notFoundFor("products");
    const categories = product.categoryId ? await all(env, "categories") : [];
    const byId = new Map(categories.map((category) => [category.id, category]));
    return ok("Product retrieved.", serializePublicProduct(product, byId));
  }
  return null;
};

// ---- admin ------------------------------------------------------------------------

const assertSkuUnique = async (env, sku, selfId = null) => {
  const clash = await findByField(env, "products", "sku", sku);
  if (clash && clash.id !== selfId) throw skuConflict(sku);
};

// Slug on update: a sent slug is made unique; otherwise the stored slug is kept (derived
// only when the record has none).
const updateSlug = async (env, collection, payload, existing) => {
  if (!payload.slug && existing.slug) return undefined;
  return resolveSlug(env, collection, {
    input: payload.slug,
    fallback: payload.name || existing.name,
    excludeId: existing.id,
  });
};

export const handleCatalogAdmin = async ({ request, env, path, body, admin, audit }) => {
  const { method } = request;

  // Categories
  if (path === "/admin/categories" && method === "GET") {
    requireCapability(admin, "catalog:read");
    return ok("Categories retrieved.", await all(env, "categories"));
  }
  if (path === "/admin/categories" && method === "POST") {
    requireCapability(admin, "catalog:write");
    const payload = categoryPayload(body);
    assertValidParent(await all(env, "categories"), payload.parentId);
    const item = await createCollectionItem(env, "categories", payload, { slugFallback: payload.name });
    audit({
      action: "category.create",
      entity: "category",
      entityId: item.id,
      summary: `Created category "${item.name}"`,
      changes: providedFields(payload),
    });
    return created("Category created.", item);
  }
  const categoryId = idAfter(path, "/admin/categories");
  if (categoryId && method === "PUT") {
    requireCapability(admin, "catalog:write");
    const existing = await getCollectionItem(env, "categories", categoryId);
    const payload = categoryPayload(body, { existing });
    if (payload.parentId !== undefined) assertValidParent(await all(env, "categories"), payload.parentId, existing.id);
    const patch = { ...payload, slug: await updateSlug(env, "categories", payload, existing) };
    const item = await updateCollectionItem(env, "categories", existing.id, patch);
    audit({
      action: "category.update",
      entity: "category",
      entityId: item.id,
      summary: `Updated category "${item.name}"`,
      changes: changedFields(existing, patch),
    });
    return ok("Category updated.", item);
  }
  if (categoryId && method === "DELETE") {
    requireCapability(admin, "catalog:write");
    const existing = await getCollectionItem(env, "categories", categoryId);
    const [categories, products] = await Promise.all([all(env, "categories"), all(env, "products")]);
    assertCategoryDeletable(existing, categories, products);
    await deleteCollectionItem(env, "categories", existing);
    audit({
      action: "category.delete",
      entity: "category",
      entityId: existing.id,
      summary: `Deleted category "${existing.name}"`,
    });
    return ok("Category deleted.", existing);
  }

  // Products
  if (path === "/admin/products" && method === "GET") {
    requireCapability(admin, "catalog:read");
    return ok("Products retrieved.", await all(env, "products"));
  }
  if (path === "/admin/products" && method === "POST") {
    requireCapability(admin, "catalog:write");
    const payload = productPayload(body);
    assertCategoryExists(await all(env, "categories"), payload.categoryId);
    await assertSkuUnique(env, payload.sku);
    const item = await createCollectionItem(env, "products", payload, { slugFallback: payload.name });
    audit({
      action: "product.create",
      entity: "product",
      entityId: item.id,
      summary: `Created product "${item.name}"`,
      changes: providedFields(payload),
    });
    return created("Product created.", item);
  }
  const productId = idAfter(path, "/admin/products");
  if (productId && method === "GET") {
    requireCapability(admin, "catalog:read");
    return ok("Product retrieved.", await getCollectionItem(env, "products", productId));
  }
  if (productId && method === "PUT") {
    requireCapability(admin, "catalog:write");
    const existing = await getCollectionItem(env, "products", productId);
    const payload = productPayload(body, { existing });
    if (payload.categoryId) assertCategoryExists(await all(env, "categories"), payload.categoryId);
    await assertSkuUnique(env, payload.sku, existing.id);
    const patch = { ...payload, slug: await updateSlug(env, "products", payload, existing) };
    // The patch never contains stockQuantity, so a concurrent adjustment is not overwritten.
    const item = await updateCollectionItem(env, "products", existing.id, patch);
    audit({
      action: "product.update",
      entity: "product",
      entityId: item.id,
      summary: `Updated product "${item.name}"`,
      changes: changedFields(existing, patch),
    });
    return ok("Product updated.", item);
  }
  if (productId && method === "DELETE") {
    requireCapability(admin, "catalog:write");
    const existing = await getCollectionItem(env, "products", productId);
    assertProductDeletable(existing, await all(env, "packages"));
    await deleteCollectionItem(env, "products", existing);
    audit({
      action: "product.delete",
      entity: "product",
      entityId: existing.id,
      summary: `Deleted product "${existing.name}"`,
    });
    return ok("Product deleted.", existing);
  }

  return null;
};
