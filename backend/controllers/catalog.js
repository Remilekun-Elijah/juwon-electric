// Categories and products (API_CONTRACT_V3 §4). Validation, filters and serializers are
// shared with the Worker (backend/shared/catalog.js).
import { uniqueSlug } from "./_catalog.js";
import { recordInitialStock } from "./inventory.js";
import { asyncHandler } from "../services/asyncHandler.js";
import { auditCreate, auditDelete, auditUpdate } from "../services/audit.js";
import { created, ok } from "../services/http.js";
import { getSettings } from "../services/settings.js";
import {
  createCollectionItem,
  deleteCollectionItem,
  findCollectionItem,
  getCollectionItem,
  getProductItem,
  isDuplicateKeyError,
  listCollection,
  updateCollectionItem,
} from "../services/store.js";
import {
  adminProductPage,
  assertCategoryDeletable,
  assertCategoryExists,
  assertProductDeletable,
  assertSkuFree,
  assertValidParent,
  categoryPayload,
  productPayload,
  publicCategories,
  publicProductPage,
  isPublicProduct,
  serializeCategory,
  serializeProduct,
  serializePublicProduct,
  skuConflict,
} from "../shared/catalog.js";
import { conflict, notFoundFor } from "../shared/errors.js";
import { definedKeys, normalizeSlug, pageParams } from "../shared/fields.js";

const all = (collection) => listCollection(collection, { includeInactive: true });

// Mongo unique indexes (slug, skuLower) catch races the pre-checks cannot.
const onDuplicate = (message) => (error) => {
  if (isDuplicateKeyError(error)) throw conflict(message);
  throw error;
};
const RETRY_MESSAGE = "Another record was saved with the same value. Please try again.";

// Slug on create: sent, else derived from the name; made unique with -2, -3, ...
const createSlug = (payload) => payload.slug || normalizeSlug(payload.name) || undefined;

// Slug on update: a sent slug (or a renamed record without one) is made unique; otherwise kept.
const updateSlug = (items, fresh, patch) => {
  const slug = patch.slug || (fresh.slug ? undefined : normalizeSlug(patch.name || fresh.name));
  return slug ? { ...patch, slug: uniqueSlug(items, slug, fresh.id) } : patch;
};

// ---- public -----------------------------------------------------------------------------

export const listPublicCategories = asyncHandler(async (_req, res) => {
  ok(res, "Categories retrieved.", publicCategories(await all("categories")));
});

export const getPublicCategory = asyncHandler(async (req, res) => {
  const category = await getCollectionItem("categories", req.params.id);
  if (category.isActive === false) throw notFoundFor("categories");
  ok(res, "Category retrieved.", serializeCategory(category));
});

export const listPublicProducts = asyncHandler(async (req, res) => {
  const page = pageParams(req.query);
  const [products, categories] = await Promise.all([all("products"), all("categories")]);
  ok(res, "Products retrieved.", publicProductPage(products, categories, req.query, page));
});

export const getPublicProduct = asyncHandler(async (req, res) => {
  const product = await getCollectionItem("products", req.params.id);
  if (!isPublicProduct(product)) throw notFoundFor("products");
  const categories = product.categoryId ? await all("categories") : [];
  ok(res, "Product retrieved.", serializePublicProduct(product, new Map(categories.map((item) => [item.id, item]))));
});

// ---- admin: categories ----------------------------------------------------------------------

export const adminListCategories = asyncHandler(async (_req, res) => {
  const categories = (await all("categories")).map(serializeCategory);
  ok(res, "Categories retrieved.", categories);
});

export const adminCreateCategory = asyncHandler(async (req, res) => {
  const payload = categoryPayload(req.body);
  assertValidParent(await all("categories"), payload.parentId);
  const item = await createCollectionItem(
    "categories",
    { ...payload, slug: createSlug(payload) },
    { prepare: (items, draft) => ({ ...draft, slug: uniqueSlug(items, draft.slug) }) }
  ).catch(onDuplicate(RETRY_MESSAGE));
  auditCreate(req, "category", item, definedKeys(payload));
  created(res, "Category created.", serializeCategory(item));
});

export const adminUpdateCategory = asyncHandler(async (req, res) => {
  const existing = await getCollectionItem("categories", req.params.id);
  const payload = categoryPayload(req.body, { isUpdate: true });
  if (payload.parentId !== undefined) assertValidParent(await all("categories"), payload.parentId, existing.id);
  const item = await updateCollectionItem("categories", existing.id, payload, {
    prepare: (items, fresh, patch) => updateSlug(items, fresh, patch),
  }).catch(onDuplicate(RETRY_MESSAGE));
  auditUpdate(req, "category", existing, item, definedKeys(payload));
  ok(res, "Category updated.", serializeCategory(item));
});

export const adminDeleteCategory = asyncHandler(async (req, res) => {
  const existing = await getCollectionItem("categories", req.params.id);
  const [categories, products] = await Promise.all([all("categories"), all("products")]);
  assertCategoryDeletable(existing, categories, products);
  const item = await deleteCollectionItem("categories", existing.id);
  auditDelete(req, "category", item);
  ok(res, "Category deleted.", serializeCategory(item));
});

// ---- admin: products --------------------------------------------------------------------------

export const adminListProducts = asyncHandler(async (req, res) => {
  const page = pageParams(req.query);
  const [products, categories] = await Promise.all([all("products"), all("categories")]);
  ok(res, "Products retrieved.", adminProductPage(products, categories, req.query, page));
});

export const adminGetProduct = asyncHandler(async (req, res) => {
  ok(res, "Product retrieved.", serializeProduct(await getProductItem(req.params.id)));
});

const assertSkuUnique = async (sku, selfId) => {
  const clash = await findCollectionItem("products", { skuLower: sku.toLowerCase() });
  if (clash && clash.id !== selfId) throw skuConflict(sku);
};

export const adminCreateProduct = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  const payload = productPayload(req.body, { defaultReorderLevel: settings.inventory.defaultReorderLevel });
  assertCategoryExists(await all("categories"), payload.categoryId);
  await assertSkuUnique(payload.sku);
  // Stock only changes through movements: the initial quantity is an "initial" movement.
  const item = await createCollectionItem(
    "products",
    { ...payload, stockQuantity: 0, slug: createSlug(payload) },
    {
      prepare: (items, draft) => {
        // JSON store: items are the full, fresh records (authoritative inside the lock).
        assertSkuFree(items.filter((entry) => entry.sku !== undefined), draft.sku);
        return { ...draft, slug: uniqueSlug(items, draft.slug) };
      },
    }
  ).catch(onDuplicate(`Another product already uses SKU ${payload.sku}.`));
  const product = payload.stockQuantity > 0 ? await recordInitialStock(req, item, payload.stockQuantity) : item;
  auditCreate(req, "product", product, definedKeys(payload).filter((key) => key !== "skuLower"));
  created(res, "Product created.", serializeProduct(product));
});

export const adminUpdateProduct = asyncHandler(async (req, res) => {
  const existing = await getProductItem(req.params.id);
  const payload = productPayload(req.body, { existing });
  if (payload.categoryId) assertCategoryExists(await all("categories"), payload.categoryId);
  if (payload.sku !== undefined) await assertSkuUnique(payload.sku, existing.id);
  const item = await updateCollectionItem("products", existing.id, payload, {
    prepare: (items, fresh, patch) => {
      if (patch.sku !== undefined) assertSkuFree(items.filter((entry) => entry.sku !== undefined), patch.sku, fresh.id);
      return updateSlug(items, fresh, patch);
    },
  }).catch(onDuplicate(`Another product already uses SKU ${payload.sku}.`));
  auditUpdate(req, "product", existing, item, definedKeys(payload).filter((key) => key !== "skuLower"));
  ok(res, "Product updated.", serializeProduct(item));
});

export const adminDeleteProduct = asyncHandler(async (req, res) => {
  const existing = await getProductItem(req.params.id);
  assertProductDeletable(existing, await all("packages"));
  const item = await deleteCollectionItem("products", existing.id);
  auditDelete(req, "product", item);
  ok(res, "Product deleted.", serializeProduct(item));
});
