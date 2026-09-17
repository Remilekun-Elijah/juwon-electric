import { catalogHandlers } from "./_catalog.js";
import { badRequest, notFound } from "../services/errors.js";
import { ok } from "../services/http.js";
import { getCollectionItem, listCollection } from "../services/store.js";
import {
  assertOptionProducts,
  packageOptionsPayload,
  packagesNeedProducts,
  serializeAdminPackage,
  serializePublicPackage,
} from "../shared/packagePricing.js";
import {
  LIMITS,
  deriveSlug,
  legacyIdField,
  numberField,
  optionalBoolean,
  optionalSlug,
  optionalString,
  requiredString,
  sortOrderField,
} from "../services/validators.js";

const positive = (value, label) => {
  if (value !== undefined && value !== null && !(value > 0)) {
    throw badRequest(`${label} must be greater than 0.`);
  }
  return value;
};

// Update: optional fields that are absent (or blank text) are not written.
const packagePayload = (body, { isUpdate }) => {
  const type = requiredString(body, "type", "Type", { max: LIMITS.packageType }).toLowerCase();
  const name = requiredString(body, "name", "Name", { max: LIMITS.packageName });
  const kva = positive(
    numberField(body, "kva", "kVA", { required: true, maxLength: LIMITS.packageKva }),
    "kVA"
  );
  const volt = positive(
    numberField(body, "volt", "Volt", { maxLength: LIMITS.packageVolt }),
    "Volt"
  );
  const category = optionalString(body, "category", {
    label: "Category",
    max: LIMITS.packageType,
  });
  const legacyId = legacyIdField(body);
  const slug = optionalSlug(body);
  const load = requiredString(body, "load", "Load", { max: LIMITS.packageLoad, multiline: true });
  // Options carry their own products (COMMERCE_V2 §1.1); top-level items are deprecated.
  const options = packageOptionsPayload(body);
  const isActive = optionalBoolean(body, "isActive", undefined);
  const sortOrder = sortOrderField(body);

  return {
    legacyId,
    type,
    category: category || type,
    name,
    slug: slug ?? (isUpdate ? undefined : deriveSlug(`${name}-${type}-${kva}`)),
    load,
    kva,
    volt: isUpdate ? volt : volt ?? null,
    options,
    isActive: isUpdate ? isActive : isActive ?? true,
    sortOrder,
    // Persists the read-time migration: an update clears the deprecated top-level items.
    items: isUpdate ? [] : undefined,
  };
};

const allProducts = async () =>
  new Map((await listCollection("products", { includeInactive: true })).map((product) => [product.id, product]));

/** Products by id when any of the packages has a composed option (prices are computed on read). */
export const productsForPackages = async (packages) => (packagesNeedProducts(packages) ? allProducts() : new Map());

const handlers = catalogHandlers({
  collection: "packages",
  entity: "package",
  buildPayload: packagePayload,
  slugSource: (item) => `${item.name}-${item.type}-${item.kva}`,
  validate: async (payload) => {
    if (packagesNeedProducts([payload])) assertOptionProducts(payload.options, await allProducts());
  },
  serialize: async (item) => serializeAdminPackage(item, await productsForPackages([item])),
  messages: { create: "Package created.", update: "Package updated.", delete: "Package deleted." },
});

export const listPackages = async (_req, res) => {
  const packages = await listCollection("packages");
  const products = await productsForPackages(packages);
  ok(res, "Packages retrieved.", packages.map((pack) => serializePublicPackage(pack, products)));
};

export const getPackage = async (req, res) => {
  const item = await getCollectionItem("packages", req.params.id);
  if (item.isActive === false) throw notFound("packages");
  ok(res, "Package retrieved.", serializePublicPackage(item, await productsForPackages([item])));
};

export const adminListPackages = async (req, res) => {
  const packages = await listCollection("packages", { includeInactive: true });
  const products = await productsForPackages(packages);
  ok(res, "Packages retrieved.", packages.map((pack) => serializeAdminPackage(pack, products)));
};

export const adminCreatePackage = handlers.create;
export const adminUpdatePackage = handlers.update;
export const adminDeletePackage = handlers.remove;
