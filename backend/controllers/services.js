import { catalogHandlers } from "./_catalog.js";
import { ok } from "../services/http.js";
import { listCollection } from "../services/store.js";
import {
  LIMITS,
  deriveSlug,
  optionalBoolean,
  optionalSlug,
  optionalString,
  optionalUrl,
  requiredString,
  requiredImageUrl,
  sortOrderField,
} from "../services/validators.js";

// Update: optional fields that are absent (or blank text) are not written.
const servicePayload = (body, { isUpdate }) => {
  const title = requiredString(body, "title", "Title", { max: LIMITS.serviceTitle });
  const slug = optionalSlug(body);
  const subtitle = requiredString(body, "subtitle", "Subtitle", { max: LIMITS.serviceSubtitle });
  const image = requiredImageUrl(body, "image", "Image");
  const ctaLabel = optionalString(body, "ctaLabel", { label: "CTA label", max: LIMITS.ctaLabel });
  const ctaUrl = optionalUrl(body, "ctaUrl", "CTA URL");
  const isActive = optionalBoolean(body, "isActive", undefined);
  const sortOrder = sortOrderField(body);

  return {
    title,
    slug: slug ?? (isUpdate ? undefined : deriveSlug(title)),
    subtitle,
    image,
    ctaLabel: ctaLabel || (isUpdate ? undefined : "Let's go"),
    ctaUrl: ctaUrl || (isUpdate ? undefined : "/packages"),
    isActive: isUpdate ? isActive : isActive ?? true,
    sortOrder,
  };
};

const segmentPayload = (body, { isUpdate }) => {
  const title = requiredString(body, "title", "Title", { max: LIMITS.serviceTitle });
  const slug = optionalSlug(body);
  const subtitle = requiredString(body, "subtitle", "Subtitle", { max: LIMITS.serviceSubtitle });
  const image = requiredImageUrl(body, "image", "Image");
  const isActive = optionalBoolean(body, "isActive", undefined);
  const sortOrder = sortOrderField(body);

  return {
    title,
    slug: slug ?? (isUpdate ? undefined : deriveSlug(title)),
    subtitle,
    image,
    isActive: isUpdate ? isActive : isActive ?? true,
    sortOrder,
  };
};

const serviceHandlers = catalogHandlers({
  collection: "services",
  entity: "service",
  buildPayload: servicePayload,
  slugSource: (item) => item.title,
  messages: { create: "Service created.", update: "Service updated.", delete: "Service deleted." },
});

const segmentHandlers = catalogHandlers({
  collection: "customerSegments",
  entity: "customerSegment",
  buildPayload: segmentPayload,
  slugSource: (item) => item.title,
  messages: {
    create: "Customer segment created.",
    update: "Customer segment updated.",
    delete: "Customer segment deleted.",
  },
});

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

export const adminCreateService = serviceHandlers.create;
export const adminUpdateService = serviceHandlers.update;
export const adminDeleteService = serviceHandlers.remove;
export const adminCreateCustomerSegment = segmentHandlers.create;
export const adminUpdateCustomerSegment = segmentHandlers.update;
export const adminDeleteCustomerSegment = segmentHandlers.remove;
