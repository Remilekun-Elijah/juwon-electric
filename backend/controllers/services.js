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
  optionalString,
  requiredString,
} from "../services/validators.js";

const servicePayload = (body, existing = {}) => {
  const title = requiredString(body, "title");

  return {
    title,
    slug: body.slug || existing.slug || normalizeSlug(title),
    subtitle: requiredString(body, "subtitle"),
    image: requiredString(body, "image"),
    ctaLabel: optionalString(body, "ctaLabel") || existing.ctaLabel || "Let's go",
    ctaUrl: optionalString(body, "ctaUrl") || existing.ctaUrl || "/packages",
    isActive: optionalBoolean(body, "isActive", existing.isActive ?? true),
    sortOrder: optionalNumber(body, "sortOrder") ?? existing.sortOrder,
  };
};

const segmentPayload = (body, existing = {}) => {
  const title = requiredString(body, "title");

  return {
    title,
    slug: body.slug || existing.slug || normalizeSlug(title),
    subtitle: requiredString(body, "subtitle"),
    image: requiredString(body, "image"),
    isActive: optionalBoolean(body, "isActive", existing.isActive ?? true),
    sortOrder: optionalNumber(body, "sortOrder") ?? existing.sortOrder,
  };
};

export const listServices = async (_req, res) => {
  const [offerings, customerSegments] = await Promise.all([
    listCollection("services"),
    listCollection("customerSegments"),
  ]);
  ok(res, "Services retrieved.", { offerings, customerSegments });
};

export const adminListServices = async (_req, res) => {
  const [offerings, customerSegments] = await Promise.all([
    listCollection("services", { includeInactive: true }),
    listCollection("customerSegments", { includeInactive: true }),
  ]);
  ok(res, "Services retrieved.", { offerings, customerSegments });
};

export const adminCreateService = async (req, res) => {
  const item = await createCollectionItem("services", servicePayload(req.body));
  created(res, "Service created.", item);
};

export const adminUpdateService = async (req, res) => {
  const existing = await getCollectionItem("services", req.params.id);
  const item = await updateCollectionItem("services", req.params.id, servicePayload(req.body, existing));
  ok(res, "Service updated.", item);
};

export const adminDeleteService = async (req, res) => {
  const item = await deleteCollectionItem("services", req.params.id);
  ok(res, "Service deleted.", item);
};

export const adminCreateCustomerSegment = async (req, res) => {
  const item = await createCollectionItem("customerSegments", segmentPayload(req.body));
  created(res, "Customer segment created.", item);
};

export const adminUpdateCustomerSegment = async (req, res) => {
  const existing = await getCollectionItem("customerSegments", req.params.id);
  const item = await updateCollectionItem(
    "customerSegments",
    req.params.id,
    segmentPayload(req.body, existing)
  );
  ok(res, "Customer segment updated.", item);
};

export const adminDeleteCustomerSegment = async (req, res) => {
  const item = await deleteCollectionItem("customerSegments", req.params.id);
  ok(res, "Customer segment deleted.", item);
};
