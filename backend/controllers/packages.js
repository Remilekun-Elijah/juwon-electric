import { catalogHandlers } from "./_catalog.js";
import { badRequest, notFound } from "../services/errors.js";
import { ok } from "../services/http.js";
import { getCollectionItem, listCollection } from "../services/store.js";
import { assertComponentsExist, componentsField } from "../shared/catalog.js";
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
  validateOptions,
} from "../services/validators.js";

const serializeForClient = (item) => ({
  id: item.legacyId ?? item.id,
  _id: item.id,
  slug: item.slug,
  type: item.type,
  category: item.category || item.type,
  name: item.name,
  load: item.load,
  kva: item.kva,
  volt: item.volt,
  options: item.options,
});

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
  const options = validateOptions(body.options);
  const isActive = optionalBoolean(body, "isActive", undefined);
  const sortOrder = sortOrderField(body);
  // Products this package is made of (stock is committed per component, see docs/agents/be-ops.md).
  const components = componentsField(body);

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
    components,
  };
};

const handlers = catalogHandlers({
  collection: "packages",
  entity: "package",
  buildPayload: packagePayload,
  slugSource: (item) => `${item.name}-${item.type}-${item.kva}`,
  validate: async (payload) => {
    if (payload.components?.length) {
      assertComponentsExist(payload.components, await listCollection("products", { includeInactive: true }));
    }
  },
  messages: { create: "Package created.", update: "Package updated.", delete: "Package deleted." },
});

export const listPackages = async (_req, res) => {
  const packages = await listCollection("packages");
  ok(res, "Packages retrieved.", packages.map(serializeForClient));
};

export const getPackage = async (req, res) => {
  const item = await getCollectionItem("packages", req.params.id);
  if (item.isActive === false) throw notFound("packages");
  ok(res, "Package retrieved.", serializeForClient(item));
};

export const adminListPackages = async (req, res) => {
  const packages = await listCollection("packages", { includeInactive: true });
  ok(res, "Packages retrieved.", packages);
};

export const adminCreatePackage = handlers.create;
export const adminUpdatePackage = handlers.update;
export const adminDeletePackage = handlers.remove;
