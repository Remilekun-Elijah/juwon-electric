import {
  createCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from "../services/store.js";
import { created, ok } from "../services/http.js";
import {
  normalizeSlug,
  optionalBoolean,
  optionalNumber,
  requiredNumber,
  requiredString,
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

const packagePayload = (body, existing = {}) => {
  const type = requiredString(body, "type").toLowerCase();
  const name = requiredString(body, "name");

  return {
    legacyId: body.legacyId ?? existing.legacyId,
    type,
    category: body.category || type,
    name,
    slug: body.slug || existing.slug || normalizeSlug(`${name}-${type}-${body.kva || existing.kva}`),
    load: requiredString(body, "load"),
    kva: requiredNumber(body, "kva"),
    volt: optionalNumber(body, "volt"),
    options: validateOptions(body.options),
    isActive: optionalBoolean(body, "isActive", existing.isActive ?? true),
    sortOrder: optionalNumber(body, "sortOrder") ?? existing.sortOrder,
  };
};

export const listPackages = async (_req, res) => {
  const packages = await listCollection("packages");
  ok(res, "Packages retrieved.", packages.map(serializeForClient));
};

export const getPackage = async (req, res) => {
  const item = await getCollectionItem("packages", req.params.id);
  ok(res, "Package retrieved.", serializeForClient(item));
};

export const adminListPackages = async (req, res) => {
  const packages = await listCollection("packages", { includeInactive: true });
  ok(res, "Packages retrieved.", packages);
};

export const adminCreatePackage = async (req, res) => {
  const item = await createCollectionItem("packages", packagePayload(req.body));
  created(res, "Package created.", item);
};

export const adminUpdatePackage = async (req, res) => {
  const existing = await getCollectionItem("packages", req.params.id);
  const item = await updateCollectionItem(
    "packages",
    req.params.id,
    packagePayload(req.body, existing)
  );
  ok(res, "Package updated.", item);
};

export const adminDeletePackage = async (req, res) => {
  const item = await deleteCollectionItem("packages", req.params.id);
  ok(res, "Package deleted.", item);
};
