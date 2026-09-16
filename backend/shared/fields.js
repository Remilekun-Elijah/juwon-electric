// Field validators for the v3 modules, shared by Express and the Worker so both reject
// the same payloads with the same messages. Messages follow the existing conventions in
// services/validators.js and cloudflare/src/validation.js.
import { badRequest } from "./errors.js";

export const OPS_LIMITS = {
  id: 64,
  sku: 64,
  productName: 150,
  categoryName: 100,
  brand: 100,
  description: 2000,
  descriptionHtml: 50000,
  attributeCount: 50,
  attributeKey: 50,
  attributeValue: 500,
  images: 20,
  tags: 20,
  tag: 50,
  url: 2048,
  slug: 120,
  moneyMax: 10_000_000_000,
  stockMax: 1_000_000_000,
  adjustmentMax: 1_000_000,
  note: 2000,
  components: 20,
  componentQuantityMax: 1000,
  checklist: 50,
  checklistLabel: 200,
  photos: 30,
  jobNotes: 5000,
  areas: 20,
  area: 100,
  certifications: 20,
  certificationName: 150,
  paymentReference: 100,
  emailsPerList: 10,
  businessName: 150,
  address: 500,
  phoneNumber: 20,
  email: 254,
  sortOrderMax: 1_000_000,
  pageMax: 100_000,
  pageLimitMax: 100,
  durationMinutesMax: 10_080,
};

const isMissing = (value) => value === undefined || value === null;

// Control (Cc) and format (Cf) characters; ZWNJ/ZWJ are allowed. Multi-line fields may
// contain tab, LF and CR.
const SINGLE_LINE_INVALID = /(?![\u200c\u200d])[\p{Cc}\p{Cf}]/u;
const MULTI_LINE_INVALID = /(?![\u200c\u200d])\p{Cf}|(?![\u0009\u000a\u000d])\p{Cc}/u;

export const tooLong = (label, max) => badRequest(`${label} must be ${max} characters or fewer.`);

/** Trimmed string, "" when absent. Order: type, trim, required, max, characters. */
export const text = (body, key, { label = key, max, required = false, multiline = false } = {}) => {
  const raw = body?.[key];
  let value;
  if (isMissing(raw)) value = "";
  else if (typeof raw === "string") value = raw.trim();
  else throw badRequest(`${label} must be text.`);
  if (required && !value) throw badRequest(`${label} is required.`);
  if (max !== undefined && value.length > max) throw tooLong(label, max);
  if (value && (multiline ? MULTI_LINE_INVALID : SINGLE_LINE_INVALID).test(value)) {
    throw badRequest(`${label} contains invalid characters.`);
  }
  return value;
};

const NUMERIC_STRING = /^\d+(\.\d+)?$/;
const INTEGER_STRING = /^-?\d+$/;

/** Number (JSON number or plain decimal string); undefined when absent and not required. */
export const number = (body, key, { label = key, required = false, min, max } = {}) => {
  const raw = body?.[key];
  if (isMissing(raw)) {
    if (required) throw badRequest(`${label} must be a number.`);
    return undefined;
  }
  let value;
  if (typeof raw === "number" && Number.isFinite(raw)) value = raw;
  else if (typeof raw === "string" && NUMERIC_STRING.test(raw) && raw.length <= 20) value = Number(raw);
  else throw badRequest(`${label} must be a number.`);
  if ((min !== undefined && value < min) || (max !== undefined && value > max)) {
    throw badRequest(`${label} must be between ${fmt(min ?? 0)} and ${fmt(max)}.`);
  }
  return value;
};

/** Whole number (JSON integer or digits string, optionally signed); undefined when absent. */
export const integer = (body, key, { label = key, required = false, min, max } = {}) => {
  const raw = body?.[key];
  if (isMissing(raw)) {
    if (required) throw badRequest(`${label} must be a whole number.`);
    return undefined;
  }
  let value;
  if (typeof raw === "number" && Number.isInteger(raw)) value = raw;
  else if (typeof raw === "string" && INTEGER_STRING.test(raw) && raw.length <= 16) value = Number(raw);
  else throw badRequest(`${label} must be a whole number.`);
  if (!Number.isSafeInteger(value)) throw badRequest(`${label} must be a whole number.`);
  if ((min !== undefined && value < min) || (max !== undefined && value > max)) {
    throw badRequest(`${label} must be a whole number from ${fmt(min)} to ${fmt(max)}.`);
  }
  return value;
};

const fmt = (value) => new Intl.NumberFormat("en-US").format(value);

export const boolean = (body, key, { label = key } = {}) => {
  const value = body?.[key];
  if (isMissing(value)) return undefined;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  throw badRequest(`${label} must be true or false.`);
};

/** Enum value; undefined when absent or "". */
export const oneOf = (body, key, allowed, { label = key, required = false } = {}) => {
  const raw = body?.[key];
  if (isMissing(raw) || raw === "") {
    if (required) throw badRequest(`${label} is required.`);
    return undefined;
  }
  if (typeof raw !== "string") throw badRequest(`${label} must be text.`);
  const value = raw.trim();
  if (!allowed.includes(value)) throw badRequest(`${label} must be one of: ${allowed.join(", ")}.`);
  return value;
};

// A site-relative path ("/foo", not "//foo") or an absolute https:// URL.
const UNSAFE_PATH_CHARS = /[\s\\\u0000-\u001f\u007f]/;
export const isSafeUrl = (value) => {
  if (typeof value !== "string" || !value) return false;
  if (value.startsWith("/")) return !value.startsWith("//") && !UNSAFE_PATH_CHARS.test(value);
  if (!/^https:\/\//i.test(value) || UNSAFE_PATH_CHARS.test(value)) return false;
  try {
    // URL is a web platform global in both Node and workerd (not in the shared ESLint globals).
    return new globalThis.URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

const checkUrl = (value, label) => {
  if (value.length > OPS_LIMITS.url) throw tooLong(label, OPS_LIMITS.url);
  if (!isSafeUrl(value)) throw badRequest(`${label} must be an https:// URL or a path starting with /.`);
  return value;
};

export const url = (body, key, { label = key, required = false } = {}) => {
  const value = text(body, key, { label, required, max: OPS_LIMITS.url });
  return value ? checkUrl(value, label) : "";
};

/** Array field; undefined when absent. `each(item, index)` validates one entry. */
export const list = (body, key, { label = key, max, each }) => {
  const raw = body?.[key];
  if (raw === undefined) return undefined;
  if (raw === null) return [];
  if (!Array.isArray(raw)) throw badRequest(`${label} must be a list.`);
  if (max !== undefined && raw.length > max) throw badRequest(`${label} can have at most ${max} entries.`);
  return raw.map((item, index) => each(item, index));
};

export const urlList = (body, key, { label = key, max }) =>
  list(body, key, {
    label,
    max,
    each: (item) => {
      if (typeof item !== "string") throw badRequest(`${label} must be a list of URLs.`);
      return checkUrl(item.trim(), `Each entry in ${label}`);
    },
  });

export const textList = (body, key, { label = key, max, itemMax, unique = true }) => {
  const values = list(body, key, {
    label,
    max,
    each: (item) => text({ value: item }, "value", { label: `Each entry in ${label}`, max: itemMax, required: true }),
  });
  return values && unique ? [...new Set(values)] : values;
};

export const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const objectField = (body, key, { label = key } = {}) => {
  const raw = body?.[key];
  if (raw === undefined) return undefined;
  if (!isPlainObject(raw)) throw badRequest(`${label} must be an object.`);
  return raw;
};

/** Record id reference: undefined when absent, null when null/"", else the trimmed id. */
export const idRef = (body, key, { label = key, required = false } = {}) => {
  const raw = body?.[key];
  if (raw === undefined && !required) return undefined;
  if (raw === null || raw === "" || raw === undefined) {
    if (required) throw badRequest(`${label} is required.`);
    return null;
  }
  return text(body, key, { label, max: OPS_LIMITS.id, required: true });
};

// Same email rule as the rest of the backend.
const EMAIL_PATTERN =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,63}$/;

export const isValidEmail = (value) => {
  if (typeof value !== "string" || value.length > OPS_LIMITS.email || !EMAIL_PATTERN.test(value)) return false;
  const local = value.slice(0, value.indexOf("@"));
  return !local.startsWith(".") && !local.endsWith(".") && !local.includes("..");
};

export const emailList = (body, key, { label = key }) =>
  list(body, key, {
    label,
    max: OPS_LIMITS.emailsPerList,
    each: (item) => {
      if (typeof item !== "string" || !isValidEmail(item.trim().toLowerCase())) {
        throw badRequest(`${label} must contain valid email addresses.`);
      }
      return item.trim().toLowerCase();
    },
  });

export const email = (body, key, { label = key } = {}) => {
  const value = text(body, key, { label, max: OPS_LIMITS.email }).toLowerCase();
  if (value && !isValidEmail(value)) throw badRequest("A valid email address is required.");
  return value;
};

const PHONE_PATTERN = /^\+?[0-9 ()-]+$/;
export const phone = (body, key, { label = "Phone number" } = {}) => {
  const value = text(body, key, { label, max: OPS_LIMITS.phoneNumber });
  if (!value) return "";
  const digits = value.replace(/\D/g, "").length;
  if (!PHONE_PATTERN.test(value) || digits < 10 || digits > 15) throw badRequest("Enter a valid phone number.");
  return value;
};

/** ISO-8601 date-time (anything Date parses to a valid time); returns the normalized ISO string. */
export const dateTime = (body, key, { label = key, required = false } = {}) => {
  const raw = body?.[key];
  if (isMissing(raw) || raw === "") {
    if (required) throw badRequest(`${label} is required.`);
    return raw === null || raw === "" ? null : undefined;
  }
  if (typeof raw !== "string" || raw.length > 40 || !/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    throw badRequest(`${label} must be an ISO 8601 date.`);
  }
  const time = new Date(raw).getTime();
  if (!Number.isFinite(time)) throw badRequest(`${label} must be an ISO 8601 date.`);
  return new Date(time).toISOString();
};

export const sortOrder = (body) => {
  const value = number(body, "sortOrder", { label: "Sort order" });
  if (value !== undefined && (value < 0 || value > OPS_LIMITS.sortOrderMax)) {
    throw badRequest("Sort order must be between 0 and 1,000,000.");
  }
  return value;
};

export const normalizeSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, OPS_LIMITS.slug)
    .replace(/-+$/, "");

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** A sent, non-blank slug normalized; undefined when absent or blank. */
export const slug = (body) => {
  const raw = text(body, "slug", { label: "Slug", max: OPS_LIMITS.slug });
  if (!raw) return undefined;
  const value = normalizeSlug(raw);
  if (UUID_SHAPE.test(value)) throw badRequest("Slug must not look like an id.");
  return value || undefined;
};

/** page/limit from a query object ({ page, limit } strings). */
export const pageParams = (query = {}, defaultLimit = 50) => {
  const pick = (value) => (Array.isArray(value) ? value[0] : value);
  const pageRaw = pick(query.page);
  const limitRaw = pick(query.limit);
  let page = 1;
  if (pageRaw !== undefined && pageRaw !== null && pageRaw !== "") {
    page = typeof pageRaw === "string" && /^\d+$/.test(pageRaw) ? Number(pageRaw) : Number.NaN;
    if (!Number.isSafeInteger(page) || page < 1 || page > OPS_LIMITS.pageMax) {
      throw badRequest("page must be a whole number from 1 to 100000.");
    }
  }
  let limit = defaultLimit;
  if (limitRaw !== undefined && limitRaw !== null && limitRaw !== "") {
    limit = typeof limitRaw === "string" && /^\d+$/.test(limitRaw) && limitRaw.length <= 15 ? Number(limitRaw) : Number.NaN;
    if (!Number.isSafeInteger(limit) || limit < 1) throw badRequest("limit must be a positive whole number.");
  }
  return { page, limit: Math.min(limit, OPS_LIMITS.pageLimitMax) };
};

/** A single query-string filter value ("" when absent), at most 100 characters. */
export const queryText = (query, key) => {
  const raw = Array.isArray(query?.[key]) ? query[key][0] : query?.[key];
  if (raw === undefined || raw === null) return "";
  if (typeof raw !== "string") throw badRequest(`${key} must be text.`);
  const value = raw.trim();
  if (value.length > 100) throw badRequest(`${key} must be 100 characters or fewer.`);
  return value;
};

export const paginate = (items, { page, limit }) => ({
  items: items.slice((page - 1) * limit, (page - 1) * limit + limit),
  page,
  limit,
  total: items.length,
});

/** Keys of `payload` whose values are not undefined. */
export const definedKeys = (payload) => Object.keys(payload).filter((key) => payload[key] !== undefined);

export const withoutUndefined = (payload) =>
  Object.fromEntries(Object.entries(payload || {}).filter(([, value]) => value !== undefined));
