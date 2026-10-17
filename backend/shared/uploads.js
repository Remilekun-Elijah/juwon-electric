// Image uploads (docs/agents/UPLOADS_V1.md): validation, keys, records, the image reference
// list, the cleanup plan and the private developer storage alert. Pure and shared by Express
// and the Worker; storage (R2 or the local disk) and the usage record live in each runtime.
//
// Storage usage and limits are developer configuration (environment variables). Nothing in
// this module is ever returned by an admin-visible API, notification or audit summary.
import { HttpError } from "./errors.js";

export const UPLOAD_MAX_BYTES = 2_000_000;
export const UPLOAD_MAX_DIMENSION = 1600;

/** Accepted media type -> file extension. SVG and every other type are rejected (XSS). */
export const UPLOAD_TYPES = Object.freeze({
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
});
const EXTENSION_TYPES = Object.fromEntries(Object.entries(UPLOAD_TYPES).map(([type, ext]) => [ext, type]));

export const UPLOAD_PURPOSES = [
  "products",
  "categories",
  "packages",
  "services",
  "portfolio",
  "segments",
  "reviews",
  "clients",
  "team",
  "jobs",
  "staff",
  "other",
];

/** Capabilities for the website and catalogue purposes (every purpose except `jobs` and `staff`). */
export const CONTENT_UPLOAD_CAPABILITIES = ["content:write", "products:write", "staff:write"];

/**
 * Purpose -> capabilities, any one of which allows the upload. Job photos: engineers on their jobs and
 * staff who manage jobs. Staff avatars: staff:write. Anything else: the content capabilities.
 */
export const PURPOSE_CAPABILITIES = Object.freeze({
  jobs: ["jobs:update-own", "jobs:assign"],
  staff: ["staff:write"],
});

/** Any one of these lets an admin upload at all (§2); the purpose then narrows it. */
export const UPLOAD_CAPABILITIES = [
  ...new Set([...CONTENT_UPLOAD_CAPABILITIES, ...Object.values(PURPOSE_CAPABILITIES).flat()]),
];

/** Capabilities that allow an upload with this (valid) purpose. */
export const capabilitiesForPurpose = (purpose) => PURPOSE_CAPABILITIES[purpose] || CONTENT_UPLOAD_CAPABILITIES;

/** True when `holds(capability)` is true for one of the purpose's capabilities. */
export const canUploadPurpose = (holds, purpose) => capabilitiesForPurpose(purpose).some((capability) => holds(capability));

export const UPLOAD_MESSAGES = {
  created: "Image uploaded.",
  config: "Upload settings retrieved.",
  tooLarge: "Image must be 2 MB or smaller.",
  badType: "Upload a JPEG, PNG or WebP image.",
  badPurpose: `Purpose must be one of: ${UPLOAD_PURPOSES.join(", ")}.`,
  // Neutral on purpose: it never mentions storage, usage or limits (§2).
  unavailable: "Image uploads are unavailable right now. Please use an image link or try again later.",
  notFound: "Image not found.",
  // 429 from the per-admin upload rate limit.
  tooMany: "You’ve uploaded a lot of images in a short time. Wait a few minutes, then try again.",
};

export const UPLOAD_CACHE_CONTROL = "public, max-age=31536000, immutable";

// Record ids: collection `system`, id `uploads-usage` -> { totalBytes, lastAlertAt }.
export const UPLOADS_COLLECTION = "uploads";
export const SYSTEM_COLLECTION = "system";
export const USAGE_ID = "uploads-usage";

export const DEFAULT_STORAGE_LIMIT_BYTES = 9_000_000_000;
export const DEFAULT_ALERT_BYTES = 8_000_000_000;
export const FREE_TIER_BYTES = 10_000_000_000;
export const ALERT_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
export const SWEEP_MIN_AGE_MS = 24 * 60 * 60 * 1000;
export const SWEEP_MAX_PER_RUN = 500;

/** GET /admin/uploads/config. Never carries usage or limits. */
export const uploadConfig = ({ enabled = true } = {}) => ({
  enabled,
  maxBytes: UPLOAD_MAX_BYTES,
  accept: Object.keys(UPLOAD_TYPES),
  maxDimension: UPLOAD_MAX_DIMENSION,
});

export const tooLarge = () => new HttpError(413, UPLOAD_MESSAGES.tooLarge);
export const unsupportedType = () => new HttpError(415, UPLOAD_MESSAGES.badType);
export const uploadsUnavailable = () => new HttpError(507, UPLOAD_MESSAGES.unavailable);

/** Positive whole number from an env value, or `fallback` (unset, 0 or not a number). */
export const bytesSetting = (value, fallback) => {
  const number = Number(String(value ?? "").trim());
  return Number.isSafeInteger(number) && number > 0 ? number : fallback;
};

export const storageLimitBytes = (env) => bytesSetting(env?.IMAGE_STORAGE_LIMIT_BYTES, DEFAULT_STORAGE_LIMIT_BYTES);
export const storageAlertBytes = (env) => bytesSetting(env?.STORAGE_ALERT_BYTES, DEFAULT_ALERT_BYTES);

/** Content-Type header -> accepted media type, or throws 415. */
export const uploadContentType = (header) => {
  const type = String(header || "").split(";")[0].trim().toLowerCase();
  if (!Object.hasOwn(UPLOAD_TYPES, type)) throw unsupportedType();
  return type;
};

/** `?purpose=`: one of UPLOAD_PURPOSES, default "other"; 400 otherwise. */
export const uploadPurpose = (value) => {
  if (value === undefined || value === null || value === "") return "other";
  if (typeof value !== "string" || !UPLOAD_PURPOSES.includes(value)) throw new HttpError(400, UPLOAD_MESSAGES.badPurpose);
  return value;
};

/** Throws 413 when a Content-Length header declares more than the limit. */
export const assertDeclaredLength = (header) => {
  if (header === undefined || header === null || String(header).trim() === "") return;
  const length = Number(header);
  if (Number.isFinite(length) && length > UPLOAD_MAX_BYTES) throw tooLarge();
};

const startsWith = (bytes, signature, offset = 0) =>
  bytes.length >= offset + signature.length && signature.every((byte, index) => bytes[offset + index] === byte);

const ascii = (text) => [...text].map((char) => char.charCodeAt(0));

/** True when the file signature matches the declared type (JPEG FF D8 FF, PNG 89 50 4E 47, RIFF....WEBP). */
export const matchesSignature = (bytes, type) => {
  if (type === "image/jpeg") return startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (type === "image/png") return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47]);
  if (type === "image/webp") return startsWith(bytes, ascii("RIFF")) && startsWith(bytes, ascii("WEBP"), 8);
  return false;
};

/** Size (1 byte to 2 MB) and signature checks on the bytes read. */
export const assertImageBytes = (bytes, type) => {
  if (!bytes.length || bytes.length > UPLOAD_MAX_BYTES) throw tooLarge();
  if (!matchesSignature(bytes, type)) throw unsupportedType();
};

/** `${purpose}/${yyyy}/${mm}/${uuid}.${ext}` (UTC year and month). */
export const uploadKey = (purpose, type, uuid, date = new Date()) => {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${purpose}/${year}/${month}/${uuid}.${UPLOAD_TYPES[type]}`;
};

const KEY_PATTERN = new RegExp(
  `^(?:${UPLOAD_PURPOSES.join("|")})/\\d{4}/\\d{2}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp)$`
);

/** True only for keys this module creates (no dots, slashes or encodings beyond the fixed shape). */
export const isUploadKey = (key) => typeof key === "string" && key.length <= 120 && KEY_PATTERN.test(key);

/** Media type served for a valid key (from its extension), or null. */
export const contentTypeForKey = (key) => {
  const match = isUploadKey(key) ? KEY_PATTERN.exec(key) : null;
  return match ? EXTENSION_TYPES[match[1]] : null;
};

/** Public URL: `${IMAGES_PUBLIC_BASE_URL}/${key}`, or `${origin}/uploads/${key}` when it is unset. */
export const uploadUrl = (publicBaseUrl, origin, key) => {
  const base = String(publicBaseUrl || "").trim().replace(/\/+$/, "");
  return base ? `${base}/${key}` : `${String(origin).replace(/\/+$/, "")}/uploads/${key}`;
};

/** The stored `uploads` record. */
export const uploadRecord = ({ id, key, url, contentType, size, purpose, actor, createdAt }) => ({
  id,
  key,
  url,
  contentType,
  size,
  purpose,
  uploadedBy: actor ? { id: actor.id, email: actor.email } : null,
  createdAt,
  updatedAt: createdAt,
});

/** 201 response data. */
export const serializeUpload = (record) => ({
  id: record.id,
  url: record.url,
  key: record.key,
  size: record.size,
  contentType: record.contentType,
});

/** `upload.create` audit entry (no usage or limit details). */
export const uploadAuditEntry = (record) => ({
  action: "upload.create",
  entity: "upload",
  entityId: record.id,
  summary: `Uploaded image ${record.key}`,
  changes: [],
});

// ---- references and cleanup (§3) --------------------------------------------------------

/**
 * Stored fields that can hold an uploaded image, by collection. `[]` marks an array of URLs,
 * dots walk into objects. Add new image fields here: the sweep never deletes a file whose key
 * appears in any of them. Text fields (rich text, answers) count when they contain the key.
 */
export const IMAGE_REFERENCE_FIELDS = Object.freeze({
  products: ["images[]", "descriptionHtml"],
  categories: ["imageUrl", "description"],
  packages: ["image", "images[]"],
  services: ["image"],
  portfolio: ["image", "summary"],
  customerSegments: ["image"],
  testimonials: ["imageUrl"],
  clients: ["logoUrl"],
  teamMembers: ["photoUrl"],
  faqs: ["answer"],
  // Staff avatars and job photos can point at uploads too; keeping them is always safe.
  admins: ["profile.avatarUrl"],
  installationJobs: ["photos[]"],
});

export const REFERENCE_COLLECTIONS = Object.keys(IMAGE_REFERENCE_FIELDS);

const valuesAt = (record, path) => {
  const isList = path.endsWith("[]");
  const value = (isList ? path.slice(0, -2) : path).split(".").reduce((node, key) => (node && typeof node === "object" ? node[key] : undefined), record);
  const values = isList ? (Array.isArray(value) ? value : []) : [value];
  return values.filter((entry) => typeof entry === "string" && entry);
};

/** Every string stored in an image or text field, from `{ collection: records[] }`. */
export const referenceTexts = (recordsByCollection) =>
  REFERENCE_COLLECTIONS.flatMap((collection) =>
    (recordsByCollection[collection] || []).flatMap((record) =>
      IMAGE_REFERENCE_FIELDS[collection].flatMap((path) => valuesAt(record, path))
    )
  );

/**
 * An upload is referenced when its key (a unique uuid path, so this also matches URLs saved
 * under another origin) or its URL appears in any reference text.
 */
export const isReferenced = (upload, texts) =>
  texts.some((text) => (upload.key && text.includes(upload.key)) || (upload.url && text.includes(upload.url)));

const timeOf = (value) => {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
};

/** Unreferenced uploads created more than 24 hours ago, oldest first, at most 500. */
export const sweepCandidates = (uploads, texts, nowMs = Date.now()) =>
  uploads
    .filter((upload) => nowMs - timeOf(upload.createdAt) > SWEEP_MIN_AGE_MS && !isReferenced(upload, texts))
    .sort((a, b) => timeOf(a.createdAt) - timeOf(b.createdAt))
    .slice(0, SWEEP_MAX_PER_RUN);

// ---- private developer alert (§4) ----------------------------------------------------------

/** True when an alert may be sent now (none sent in the last 7 days). */
export const alertAllowed = (usage, nowMs = Date.now()) => {
  const last = usage?.lastAlertAt ? timeOf(usage.lastAlertAt) : 0;
  return !last || nowMs - last >= ALERT_INTERVAL_MS;
};

const splitEmails = (value) =>
  String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => /^[^\s@<>]+@[^\s@<>]+$/.test(entry));

const addressOf = (value) => (String(value || "").match(/<([^<>]+)>/)?.[1] || String(value || "")).trim().toLowerCase();

/**
 * STORAGE_ALERT_EMAIL addresses minus every admin address (`excluded`: ADMIN_NOTIFY_EMAIL,
 * the default mailbox, admin accounts, notification lists). The alert is developer-only.
 */
export const alertRecipients = (value, excluded = []) => {
  const blocked = new Set(excluded.flatMap((entry) => (Array.isArray(entry) ? entry : String(entry || "").split(","))).map(addressOf).filter(Boolean));
  return [...new Set(splitEmails(value).map((entry) => entry.toLowerCase()))].filter((entry) => !blocked.has(entry));
};

const gb = (bytes) => (Number(bytes) / 1_000_000_000).toFixed(2);

/** Plain developer email: subject, text and a minimal html copy. */
export const storageAlertEmail = ({ totalBytes, alertBytes, limitBytes, refused = false }) => {
  const lines = [
    `Uploaded images on the Juwon Electric site now use ${gb(totalBytes)} GB of storage.`,
    refused
      ? `An upload was refused because it would pass the configured cap of ${gb(limitBytes)} GB (IMAGE_STORAGE_LIMIT_BYTES).`
      : `This is at or above the alert threshold of ${gb(alertBytes)} GB (STORAGE_ALERT_BYTES).`,
    "",
    `The Cloudflare R2 free tier includes ${gb(FREE_TIER_BYTES)} GB stored, 1 million uploads and 10 million reads a month, with free egress.`,
    "",
    "Suggested actions:",
    "- Check the bucket for large or duplicate images and remove the ones the site no longer uses (the daily sweep removes unreferenced uploads older than 24 hours).",
    "- Ask the site owners to upload resized images or use image links for large galleries.",
    "- Raise IMAGE_STORAGE_LIMIT_BYTES only if the extra R2 storage cost is expected.",
    "",
    "This alert goes only to STORAGE_ALERT_EMAIL and is sent at most once every 7 days. Admins do not see it.",
  ];
  const text = lines.join("\n");
  const escape = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return {
    subject: `Juwon Electric: image storage at ${gb(totalBytes)} GB`,
    text,
    html: `<pre style="font-family:inherit;white-space:pre-wrap">${escape(text)}</pre>`,
  };
};
