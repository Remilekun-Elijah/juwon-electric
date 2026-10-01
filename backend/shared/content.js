// Website content (LANDING_V1 §1, §2; TEAM_AND_MOTION_V1 §1): FAQs, reviews (testimonials), client
// logos, team members and the portfolio case-study fields. Validation, public filtering and serializers shared by Express
// and the Worker. Pure: storage lives in each runtime.
import { badRequest } from "./errors.js";
import { OPS_LIMITS, boolean, integer, isPlainObject, oneOf, queryText, sortOrder, text } from "./fields.js";

export const CONTENT_COLLECTIONS = ["faqs", "testimonials", "clients", "teamMembers", "reasons"];

/** Icons a "Why customers choose us" reason can use (the storefront maps each key to a lucide icon). */
export const REASON_ICONS = [
  "wrench",
  "clipboard",
  "phone",
  "badge",
  "shield",
  "truck",
  "battery",
  "sun",
  "clock",
  "users",
  "spark",
  "thumbs-up",
];
export const TESTIMONIAL_SOURCES = ["website", "whatsapp", "google", "facebook", "in_person"];

export const CONTENT_LIMITS = {
  faqQuestionMin: 5,
  faqQuestion: 200,
  faqAnswer: 2000,
  faqCategory: 60,
  personName: 100,
  testimonialContext: 150,
  testimonialQuoteMin: 10,
  testimonialQuote: 1000,
  clientName: 100,
  portfolioCategory: 60,
  portfolioSummary: 500,
  portfolioLocation: 100,
  portfolioSystem: 200,
  teamName: 100,
  teamRole: 80,
  teamGroup: 60,
  teamBio: 300,
  reasonTitleMin: 3,
  reasonTitle: 80,
  reasonTextMin: 10,
  reasonText: 300,
};

const SITE_PATH = /^\/[A-Za-z0-9._/-]{1,200}$/;
const CATEGORY_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const sent = (body, key) => body[key] !== undefined;

/** Absolute http(s) URL (<= 2048) or a site path matching ^/[A-Za-z0-9._/-]{1,200}$. */
export const isImageRef = (value) => {
  if (typeof value !== "string" || !value) return false;
  if (value.startsWith("/")) return SITE_PATH.test(value) && !value.startsWith("//");
  return isHttpUrl(value);
};

export const isHttpUrl = (value) => {
  if (typeof value !== "string" || value.length > OPS_LIMITS.url || !/^https?:\/\//i.test(value) || /\s/.test(value)) {
    return false;
  }
  try {
    const { protocol, hostname } = new globalThis.URL(value);
    return (protocol === "http:" || protocol === "https:") && Boolean(hostname);
  } catch {
    return false;
  }
};

const imageRef = (body, key, label, { required = false } = {}) => {
  const value = text(body, key, { label, required, max: OPS_LIMITS.url });
  if (!value) return null;
  if (!isImageRef(value)) throw badRequest(`${label} must be an http(s) URL or a path starting with /.`);
  return value;
};

const httpUrl = (body, key, label) => {
  const value = text(body, key, { label, max: OPS_LIMITS.url });
  if (!value) return null;
  if (!isHttpUrl(value)) throw badRequest(`${label} must be an http(s) URL.`);
  return value;
};

const httpsUrl = (body, key, label) => {
  const value = text(body, key, { label, max: OPS_LIMITS.url });
  if (!value) return null;
  if (!/^https:\/\//i.test(value) || !isHttpUrl(value)) throw badRequest(`${label} must be an https URL.`);
  return value;
};

const minLength = (value, min, label) => {
  if (value && value.length < min) throw badRequest(`${label} must be at least ${min} characters.`);
  return value;
};

/** Fields that don't count as editing a sample record: moving it or hiding it keeps its Sample label. */
const NON_EDIT_FIELDS = new Set(["sample", "sortOrder", "isActive", "slug"]);

/**
 * Update payloads always carry `sample: false`. For a stored sample record, drop that unless a content
 * field actually changed, so reordering, showing/hiding or re-saving unchanged values keeps it a sample.
 */
export const keepSampleUnlessEdited = (existing, payload) => {
  if (existing?.sample !== true || payload?.sample !== false) return payload;
  const edited = Object.entries(payload).some(
    ([key, value]) =>
      !NON_EDIT_FIELDS.has(key) && value !== undefined && JSON.stringify(value) !== JSON.stringify(existing[key] ?? null)
  );
  if (edited) return payload;
  const { sample: _sample, ...rest } = payload;
  return rest;
};

/**
 * Builds a payload from per-field parsers. Create: every field is parsed (defaults applied).
 * Update (partial): only sent fields. `sample` is never accepted from a request: records
 * created or saved through the API are real content (§0).
 */
const buildPayload = (body, isUpdate, fields) => {
  const input = isPlainObject(body) ? body : {};
  const payload = {};
  for (const [key, parse] of Object.entries(fields)) {
    if (!isUpdate || sent(input, key)) payload[key] = parse(input);
  }
  if (sent(input, "sortOrder")) payload.sortOrder = sortOrder(input);
  if (!isUpdate || sent(input, "isActive")) payload.isActive = boolean(input, "isActive", { label: "isActive" }) ?? true;
  payload.sample = false;
  return payload;
};

// ---- FAQs (§1.1) ------------------------------------------------------------------------

export const faqPayload = (body, { isUpdate = false } = {}) =>
  buildPayload(body, isUpdate, {
    question: (input) =>
      minLength(
        text(input, "question", { label: "Question", required: true, max: CONTENT_LIMITS.faqQuestion }),
        CONTENT_LIMITS.faqQuestionMin,
        "Question"
      ),
    answer: (input) =>
      text(input, "answer", { label: "Answer", required: true, max: CONTENT_LIMITS.faqAnswer, multiline: true }),
    category: (input) => text(input, "category", { label: "Category", max: CONTENT_LIMITS.faqCategory }) || null,
  });

export const serializeFaq = (item) => ({
  id: item.id,
  question: item.question ?? "",
  answer: item.answer ?? "",
  category: item.category || null,
  ...commonFields(item),
});

// ---- Reviews (§1.2) ---------------------------------------------------------------------

const rating = (input) => {
  if (input.rating === null || input.rating === "") return null;
  return integer(input, "rating", { label: "Rating", min: 1, max: 5 }) ?? null;
};

export const testimonialPayload = (body, { isUpdate = false } = {}) =>
  buildPayload(body, isUpdate, {
    name: (input) => text(input, "name", { label: "Name", required: true, max: CONTENT_LIMITS.personName }),
    context: (input) => text(input, "context", { label: "Context", max: CONTENT_LIMITS.testimonialContext }) || null,
    quote: (input) =>
      minLength(
        text(input, "quote", { label: "Quote", required: true, max: CONTENT_LIMITS.testimonialQuote, multiline: true }),
        CONTENT_LIMITS.testimonialQuoteMin,
        "Quote"
      ),
    rating,
    source: (input) => (input.source === null ? null : oneOf(input, "source", TESTIMONIAL_SOURCES, { label: "Source" }) ?? null),
    imageUrl: (input) => imageRef(input, "imageUrl", "Image URL"),
  });

export const serializeTestimonial = (item) => ({
  id: item.id,
  name: item.name ?? "",
  context: item.context || null,
  quote: item.quote ?? "",
  rating: Number.isInteger(item.rating) ? item.rating : null,
  source: TESTIMONIAL_SOURCES.includes(item.source) ? item.source : null,
  imageUrl: item.imageUrl || null,
  ...commonFields(item),
});

// ---- Client logos (§1.3) ----------------------------------------------------------------

export const clientPayload = (body, { isUpdate = false } = {}) =>
  buildPayload(body, isUpdate, {
    name: (input) => text(input, "name", { label: "Name", required: true, max: CONTENT_LIMITS.clientName }),
    logoUrl: (input) => imageRef(input, "logoUrl", "Logo URL", { required: true }),
    website: (input) => httpUrl(input, "website", "Website"),
  });

export const serializeClient = (item) => ({
  id: item.id,
  name: item.name ?? "",
  logoUrl: item.logoUrl ?? "",
  website: item.website || null,
  ...commonFields(item),
});

// ---- Team members (TEAM_AND_MOTION_V1 §1) ----------------------------------------------------

export const teamMemberPayload = (body, { isUpdate = false } = {}) =>
  buildPayload(body, isUpdate, {
    name: (input) => text(input, "name", { label: "Name", required: true, max: CONTENT_LIMITS.teamName }),
    role: (input) => text(input, "role", { label: "Role", required: true, max: CONTENT_LIMITS.teamRole }),
    group: (input) => text(input, "group", { label: "Group", required: true, max: CONTENT_LIMITS.teamGroup }),
    bio: (input) => text(input, "bio", { label: "Bio", max: CONTENT_LIMITS.teamBio }) || null,
    photoUrl: (input) => imageRef(input, "photoUrl", "Photo URL"),
    linkedinUrl: (input) => httpsUrl(input, "linkedinUrl", "LinkedIn URL"),
  });

export const serializeTeamMember = (item) => ({
  id: item.id,
  name: item.name ?? "",
  role: item.role ?? "",
  group: item.group ?? "",
  bio: item.bio || null,
  photoUrl: item.photoUrl || null,
  linkedinUrl: item.linkedinUrl || null,
  ...commonFields(item),
});

// ---- shared shape, lists and filters ------------------------------------------------------

function commonFields(item) {
  return {
    sortOrder: Number(item.sortOrder) || 0,
    isActive: item.isActive !== false,
    sample: item.sample === true,
    createdAt: item.createdAt ?? null,
    updatedAt: item.updatedAt ?? null,
  };
}

// ---- Why customers choose us (§1.5) -----------------------------------------------------

export const reasonPayload = (body, { isUpdate = false } = {}) =>
  buildPayload(body, isUpdate, {
    title: (input) =>
      minLength(
        text(input, "title", { label: "Title", required: true, max: CONTENT_LIMITS.reasonTitle }),
        CONTENT_LIMITS.reasonTitleMin,
        "Title"
      ),
    text: (input) =>
      minLength(
        text(input, "text", { label: "Text", required: true, max: CONTENT_LIMITS.reasonText, multiline: true }),
        CONTENT_LIMITS.reasonTextMin,
        "Text"
      ),
    icon: (input) => oneOf(input, "icon", REASON_ICONS, { label: "Icon" }) ?? REASON_ICONS[0],
  });

export const serializeReason = (item) => ({
  id: item.id,
  title: item.title ?? "",
  text: item.text ?? "",
  icon: REASON_ICONS.includes(item.icon) ? item.icon : REASON_ICONS[0],
  ...commonFields(item),
});

/**
 * Per collection: URL path (`/<path>` public, `/admin/<path>` admin), payload builder, serializer,
 * audit entity, messages and the audit label.
 */
export const CONTENT_MODULES = {
  faqs: {
    path: "faqs",
    entity: "faq",
    noun: "FAQ",
    payload: faqPayload,
    serialize: serializeFaq,
    label: (item) => item?.question,
    messages: { list: "FAQs retrieved.", create: "FAQ created.", update: "FAQ updated.", delete: "FAQ deleted." },
  },
  testimonials: {
    path: "testimonials",
    entity: "testimonial",
    noun: "review",
    payload: testimonialPayload,
    serialize: serializeTestimonial,
    label: (item) => item?.name,
    messages: { list: "Reviews retrieved.", create: "Review created.", update: "Review updated.", delete: "Review deleted." },
  },
  clients: {
    path: "clients",
    entity: "client",
    noun: "client",
    payload: clientPayload,
    serialize: serializeClient,
    label: (item) => item?.name,
    messages: { list: "Clients retrieved.", create: "Client created.", update: "Client updated.", delete: "Client deleted." },
  },
  reasons: {
    path: "reasons",
    entity: "reason",
    noun: "reason",
    payload: reasonPayload,
    serialize: serializeReason,
    label: (item) => item?.title,
    messages: { list: "Reasons retrieved.", create: "Reason created.", update: "Reason updated.", delete: "Reason deleted." },
  },
  teamMembers: {
    path: "team",
    entity: "team_member",
    noun: "team member",
    payload: teamMemberPayload,
    serialize: serializeTeamMember,
    label: (item) => item?.name,
    messages: {
      list: "Team retrieved.",
      create: "Team member created.",
      update: "Team member updated.",
      delete: "Team member deleted.",
    },
  },
};

const time = (value) => {
  const parsed = new Date(value ?? 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

/** sortOrder, then createdAt, then id. */
export const contentOrder = (a, b) =>
  (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0) ||
  time(a.createdAt) - time(b.createdAt) ||
  String(a.id).localeCompare(String(b.id));

/** Next sortOrder for a create without one (matches the Worker store: max + 1). */
export const nextContentSortOrder = (items) =>
  items.reduce((max, item) => Math.max(max, Number(item.sortOrder) || 0), 0) + 1;

/**
 * List response for a content collection. Public: active only. `?category=` (FAQs only)
 * matches case-insensitively; blank means no filter.
 */
export const contentList = (collection, items, query = {}, { publicView = false } = {}) => {
  const { serialize } = CONTENT_MODULES[collection];
  const category = collection === "faqs" ? queryText(query, "category").toLowerCase() : "";
  return items
    .filter((item) => !publicView || item.isActive !== false)
    .filter((item) => !category || String(item.category || "").trim().toLowerCase() === category)
    .sort(contentOrder)
    .map(serialize);
};

/** Audit summary, e.g. `Created FAQ "Do I pay to place an order?"`. */
export const contentAuditSummary = (collection, verb, item) => {
  const { noun, label } = CONTENT_MODULES[collection];
  return `${verb} ${noun} "${String(label(item) || item?.id || "").slice(0, 120)}"`;
};

// ---- Portfolio case-study fields (§2) -----------------------------------------------------

const portfolioCategory = (input) => {
  const value = text(input, "category", { label: "Category", max: CONTENT_LIMITS.portfolioCategory }).toLowerCase();
  if (!value) return null;
  if (!CATEGORY_SLUG.test(value)) throw badRequest("Category must be a customer segment slug.");
  return value;
};

const PORTFOLIO_FIELDS = {
  category: portfolioCategory,
  summary: (input) =>
    text(input, "summary", { label: "Summary", max: CONTENT_LIMITS.portfolioSummary, multiline: true }) || null,
  location: (input) => text(input, "location", { label: "Location", max: CONTENT_LIMITS.portfolioLocation }) || null,
  system: (input) => text(input, "system", { label: "Amount", max: CONTENT_LIMITS.portfolioSystem }) || null,
};

/**
 * Case-study fields of a portfolio create/update body. Create: all four (null when blank).
 * Update: only sent fields ("" or null clears). Every API save stores `sample: false`.
 */
export const portfolioCaseStudyPayload = (body, { isUpdate = false } = {}) => {
  const input = isPlainObject(body) ? body : {};
  const payload = {};
  for (const [key, parse] of Object.entries(PORTFOLIO_FIELDS)) {
    if (!isUpdate || sent(input, key)) payload[key] = parse(input);
  }
  payload.sample = false;
  return payload;
};

/** Portfolio record with the case-study fields present (null/false for older records). */
export const serializePortfolio = (item) => ({
  ...item,
  category: item.category || null,
  summary: item.summary || null,
  location: item.location || null,
  system: item.system || null,
  sample: item.sample === true,
});

/** GET /portfolio: `featured=true` and `category=<slug>` filters (both optional). */
export const filterPortfolio = (items, query = {}) => {
  const category = queryText(query, "category").toLowerCase();
  return items
    .filter((item) => queryText(query, "featured") !== "true" || item.featured)
    .filter((item) => !category || String(item.category || "").toLowerCase() === category)
    .map(serializePortfolio);
};
