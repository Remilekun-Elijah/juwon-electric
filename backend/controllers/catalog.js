// Categories and products (PRD §6.1). Validation and serializers are shared with the
// Worker (backend/shared/catalog.js).
import { uniqueSlug } from "./_catalog.js";
import { recordInitialStock } from "./inventory.js";
import { asyncHandler } from "../services/asyncHandler.js";
import { auditCreate, auditDelete, auditUpdate } from "../services/audit.js";
import { created, ok } from "../services/http.js";
import {
  createCollectionItem,
  deleteCollectionItem,
  findCollectionItem,
  getCollectionItem,
  isDuplicateKeyError,
  listCollection,
  updateCollectionItem,
} from "../services/store.js";
import {
  assertCategoryDeletable,
  assertCategoryExists,
  assertProductDeletable,
  assertSkuFree,
  assertValidParent,
  categoryPayload,
  filterPublicProducts,
  isPublicProduct,
  productPayload,
  serializePublicCategory,
  serializePublicProduct,
  skuConflict,
} from "../shared/catalog.js";
import { conflict, notFoundFor } from "../shared/errors.js";
import { definedKeys, normalizeSlug, queryText } from "../shared/fields.js";

const all = (collection) => listCollection(collection, { includeInactive: true });

// Mongo unique indexes (slug, sku) catch races the pre-checks cannot.
const onDuplicate = (message) => (error) => {
  if (isDuplicateKeyError(error)) throw conflict(message);
  throw error;
};
const RETRY_MESSAGE = "Another record was saved with the same value. Please try again.";

// ---- public -----------------------------------------------------------------------

export const listPublicCategories = asyncHandler(async (_req, res) => {
  const categories = await listCollection("categories");
  ok(res, "Categories retrieved.", categories.map(serializePublicCategory));
});

export const getPublicCategory = asyncHandler(async (req, res) => {
  const category = await getCollectionItem("categories", req.params.id);
  if (category.isActive === false) throw notFoundFor("categories");
  ok(res, "Category retrieved.", serializePublicCategory(category));
});

export const listPublicProducts = asyncHandler(async (req, res) => {
  const [products, categories] = await Promise.all([listCollection("products"), all("categories")]);
  const filtered = filterPublicProducts(products, categories, queryText(req.query, "category"));
  if (!filtered) throw notFoundFor("categories");
  const byId = new Map(categories.map((category) => [category.id, category]));
  ok(res, "Products retrieved.", filtered.map((product) => serializePublicProduct(product, byId)));
});

export const getPublicProduct = asyncHandler(async (req, res) => {
  const product = await getCollectionItem("products", req.params.id);
  if (!isPublicProduct(product)) throw notFoundFor("products");
  const categories = product.categoryId ? await all("categories") : [];
  const byId = new Map(categories.map((category) => [category.id, category]));
  ok(res, "Product retrieved.", serializePublicProduct(product, byId));
});

// ---- admin: categories ----------------------------------------------------------------

export const adminListCategories = asyncHandler(async (_req, res) => {
  ok(res, "Categories retrieved.", await all("categories"));
});

export const adminCreateCategory = asyncHandler(async (req, res) => {
  const payload = categoryPayload(req.body || {});
  assertValidParent(await all("categories"), payload.parentId);
  const item = await createCollectionItem(
    "categories",
    { ...payload, slug: payload.slug || normalizeSlug(payload.name) || undefined },
    {
      prepare: (items, draft) => ({ ...draft, slug: uniqueSlug(items, draft.slug) }),
    }
  ).catch(onDuplicate(RETRY_MESSAGE));
  auditCreate(req, "category", item, definedKeys(payload));
  created(res, "Category created.", item);
});

export const adminUpdateCategory = asyncHandler(async (req, res) => {
  const existing = await getCollectionItem("categories", req.params.id);
  const payload = categoryPayload(req.body || {}, { existing });
  if (payload.parentId !== undefined) assertValidParent(await all("categories"), payload.parentId, existing.id);
  const item = await updateCollectionItem("categories", existing.id, payload, {
    prepare: (items, fresh, patch) => {
      const slug = patch.slug || (fresh.slug ? undefined : normalizeSlug(patch.name || fresh.name));
      return slug ? { ...patch, slug: uniqueSlug(items, slug, fresh.id) } : patch;
    },
  }).catch(onDuplicate(RETRY_MESSAGE));
  auditUpdate(req, "category", existing, item, definedKeys(payload));
  ok(res, "Category updated.", item);
});

export const adminDeleteCategory = asyncHandler(async (req, res) => {
  const existing = await getCollectionItem("categories", req.params.id);
  const [categories, products] = await Promise.all([all("categories"), all("products")]);
  assertCategoryDeletable(existing, categories, products);
  const item = await deleteCollectionItem("categories", existing.id);
  auditDelete(req, "category", item);
  ok(res, "Category deleted.", item);
});

// ---- admin: products ------------------------------------------------------------------

export const adminListProducts = asyncHandler(async (_req, res) => {
  ok(res, "Products retrieved.", await all("products"));
});

export const adminGetProduct = asyncHandler(async (req, res) => {
  ok(res, "Product retrieved.", await getCollectionItem("products", req.params.id));
});

const assertSkuUnique = async (sku, selfId) => {
  const clash = await findCollectionItem("products", { sku });
  if (clash && clash.id !== selfId) throw skuConflict(sku);
};

export const adminCreateProduct = asyncHandler(async (req, res) => {
  const payload = productPayload(req.body || {});
  assertCategoryExists(await all("categories"), payload.categoryId);
  await assertSkuUnique(payload.sku);
  // Stock only changes through movements: the initial quantity is an "initial" movement.
  const item = await createCollectionItem(
    "products",
    { ...payload, stockQuantity: 0, slug: payload.slug || normalizeSlug(payload.name) || undefined },
    {
      prepare: (items, draft) => {
        // JSON store: items are the full, fresh records (authoritative inside the lock).
        assertSkuFree(items.filter((entry) => entry.sku !== undefined), draft.sku);
        return { ...draft, slug: uniqueSlug(items, draft.slug) };
      },
    }
  ).catch(onDuplicate(`Another product already uses SKU ${payload.sku} or this slug.`));
  const product = payload.stockQuantity > 0 ? await recordInitialStock(req, item, payload.stockQuantity) : item;
  auditCreate(req, "product", product, definedKeys(payload));
  created(res, "Product created.", product);
});

export const adminUpdateProduct = asyncHandler(async (req, res) => {
  const existing = await getCollectionItem("products", req.params.id);
  const payload = productPayload(req.body || {}, { existing });
  if (payload.categoryId) assertCategoryExists(await all("categories"), payload.categoryId);
  await assertSkuUnique(payload.sku, existing.id);
  const item = await updateCollectionItem("products", existing.id, payload, {
    prepare: (items, fresh, patch) => {
      assertSkuFree(items.filter((entry) => entry.sku !== undefined), patch.sku, fresh.id);
      // An echoed stockQuantity must still match: stock may have moved since validation.
      const sentStock = req.body?.stockQuantity;
      if (sentStock !== undefined && sentStock !== null && Number(sentStock) !== Number(fresh.stockQuantity || 0)) {
        throw conflict("The stock quantity changed. Reload the product and try again.");
      }
      const slug = patch.slug || (fresh.slug ? undefined : normalizeSlug(patch.name || fresh.name));
      return slug ? { ...patch, slug: uniqueSlug(items, slug, fresh.id) } : patch;
    },
  }).catch(onDuplicate(`Another product already uses SKU ${payload.sku} or this slug.`));
  auditUpdate(req, "product", existing, item, definedKeys(payload));
  ok(res, "Product updated.", item);
});

export const adminDeleteProduct = asyncHandler(async (req, res) => {
  const existing = await getCollectionItem("products", req.params.id);
  assertProductDeletable(existing, await all("packages"));
  const item = await deleteCollectionItem("products", existing.id);
  auditDelete(req, "product", item);
  ok(res, "Product deleted.", item);
});
