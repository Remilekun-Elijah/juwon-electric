import { randomBytes } from "crypto";
import { ApiError, badRequest } from "./errors.js";
import { isImageUrl } from "../shared/fields.js";

// Shared email rule (same regex in the Worker and the frontend), plus: total
// length <= 254 and no leading/trailing/consecutive dots in the local part.
export const EMAIL_REGEX =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,63}$/;

// Shared field limits (characters, after trim). Keep in sync with the
// Cloudflare Worker and docs/API.md.
export const LIMITS = {
  personName: 100,
  phoneNumber: 20,
  email: 254,
  contactMessage: 5000,
  deliveryAddress: 500,
  source: 50,
  replySubject: 200,
  replyMessage: 10000,
  note: 2000,
  packageName: 100,
  packageType: 50,
  packageLoad: 1000,
  packageKva: 20,
  packageVolt: 20,
  optionName: 100,
  optionKits: 500,
  serviceTitle: 150,
  serviceSubtitle: 500,
  ctaLabel: 50,
  portfolioName: 150,
  url: 2048,
  slug: 120,
  adminName: 100,
  passwordMin: 12,
  passwordMax: 128,
  resetToken: 256,
  turnstileToken: 2048,
  sessionId: 256,
  inboundSubject: 998,
  inboundFrom: 512,
  inboundMessage: 10000,
  orderItems: 50,
  cartItems: 50,
  packageOptions: 10,
  quantityMax: 100,
  optionPriceMax: 1_000_000_000,
  sortOrderMax: 1_000_000,
  legacyIdMax: 1_000_000_000,
  itemText: 50,
  itemPackage: 600,
  itemId: 64,
};

const tooLong = (label, max) =>
  badRequest(`${label} must be ${max} characters or fewer.`);

const checkMax = (value, label, max) => {
  if (max !== undefined && value.length > max) throw tooLong(label, max);
  return value;
};

// Control (Cc) and format (Cf: zero-width space, BOM, bidi overrides...)
// characters. Multi-line fields may contain \t, \n and \r. ZWNJ (U+200C) and
// ZWJ (U+200D) are allowed everywhere: emoji sequences and some scripts need them.
const SINGLE_LINE_INVALID = /\p{Cc}|(?![\u200C\u200D])\p{Cf}/u;
const MULTI_LINE_INVALID = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]|(?![\u200C\u200D])\p{Cf}/u;

const checkChars = (value, label, multiline = false) => {
  if ((multiline ? MULTI_LINE_INVALID : SINGLE_LINE_INVALID).test(value)) {
    throw badRequest(`${label} contains invalid characters.`);
  }
  return value;
};

// Inbound email content is cleaned instead of rejected.
const SINGLE_LINE_STRIP = /\p{Cc}|(?![\u200C\u200D])\p{Cf}/gu;
const MULTI_LINE_STRIP = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]|(?![\u200C\u200D])\p{Cf}/gu;
export const stripInvalidChars = (value, multiline = false) =>
  String(value ?? "").replace(multiline ? MULTI_LINE_STRIP : SINGLE_LINE_STRIP, "");

// requiredString(body, field, label?, { max, multiline }?)
export const requiredString = (body, field, label = field, { max, multiline = false } = {}) => {
  const value = body?.[field];
  if (value !== undefined && value !== null && typeof value !== "string") {
    throw badRequest(`${label} must be text.`);
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    throw badRequest(`${label} is required.`);
  }
  return checkChars(checkMax(value.trim(), label, max), label, multiline);
};

// optionalString(body, field, { max, label, multiline }?)
export const optionalString = (body, field, { max, label = field, multiline = false } = {}) => {
  const value = body?.[field];
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") throw badRequest(`${label} must be text.`);
  return checkChars(checkMax(value.trim(), label, max), label, multiline);
};

// Numeric admin fields: a finite JSON number, or a string of plain digits with
// an optional decimal part ("12", "12.5"). Hex, exponents, blanks and padded
// strings are rejected.
const NUMERIC_STRING = /^\d+(\.\d+)?$/;
export const parseNumeric = (raw, label) => {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && NUMERIC_STRING.test(raw)) {
    const number = Number(raw);
    if (Number.isFinite(number)) return number;
  }
  throw badRequest(`${label} must be a number.`);
};

/**
 * Numeric field. Returns undefined when the key is absent, null when it is
 * explicitly null (and not required), otherwise the number.
 */
export const numberField = (body, field, label, { required = false, maxLength } = {}) => {
  const raw = body?.[field];
  if (raw === undefined || raw === null) {
    if (required) throw badRequest(`${label} must be a number.`);
    return raw;
  }
  const value = parseNumeric(raw, label);
  if (maxLength !== undefined && String(raw).length > maxLength) throw tooLong(label, maxLength);
  return value;
};

export const sortOrderField = (body) => {
  const value = numberField(body, "sortOrder", "Sort order");
  if (value === undefined || value === null) return undefined;
  if (value < 0 || value > LIMITS.sortOrderMax) {
    throw badRequest("Sort order must be between 0 and 1,000,000.");
  }
  return value;
};

export const legacyIdField = (body) => {
  const value = numberField(body, "legacyId", "legacyId");
  if (value === undefined || value === null) return undefined;
  if (!Number.isInteger(value) || value < 0 || value > LIMITS.legacyIdMax) {
    throw badRequest("legacyId must be a whole number from 0 to 1,000,000,000.");
  }
  return value;
};

export const optionalBoolean = (body, field, defaultValue = true) => {
  const value = body?.[field];
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw badRequest(`${field} must be true or false.`);
};

export const isValidEmail = (value) => {
  if (typeof value !== "string" || value.length > LIMITS.email || !EMAIL_REGEX.test(value)) {
    return false;
  }
  const local = value.slice(0, value.indexOf("@"));
  return !local.startsWith(".") && !local.endsWith(".") && !local.includes("..");
};

export const validateEmail = (email, required = false) => {
  if (!email && !required) return "";
  if (typeof email === "string" && email.trim().length > LIMITS.email) {
    throw tooLong("Email address", LIMITS.email);
  }
  if (!email || typeof email !== "string" || !isValidEmail(email.trim())) {
    throw badRequest("A valid email address is required.");
  }
  return email.trim().toLowerCase();
};

// Digits, spaces (no tabs), "-", "(", ")" and one optional leading "+"; 10-15 digits.
const PHONE_CHARS = /^\+?[0-9 ()-]+$/;
export const validatePhone = (value) => {
  if (value.length > LIMITS.phoneNumber) throw tooLong("Phone number", LIMITS.phoneNumber);
  const digits = value.replace(/[^0-9]/g, "").length;
  if (!PHONE_CHARS.test(value) || digits < 10 || digits > 15) {
    throw badRequest("Enter a valid phone number.");
  }
  return value;
};

export const requiredPhone = (body, field = "phoneNumber", label = "Phone number") =>
  validatePhone(requiredString(body, field, label));

export const optionalPhone = (body, field = "phoneNumber", label = "Phone number") => {
  const value = optionalString(body, field, { label });
  return value ? validatePhone(value) : "";
};

// A site-relative path ("/foo", not "//foo") or an absolute https:// URL.
const UNSAFE_PATH_CHARS = /[\s\\\u0000-\u001f\u007f]/;
export const isSafeUrl = (value) => {
  if (typeof value !== "string" || !value) return false;
  if (value.startsWith("/")) {
    return !value.startsWith("//") && !UNSAFE_PATH_CHARS.test(value);
  }
  if (!/^https:\/\//i.test(value) || UNSAFE_PATH_CHARS.test(value)) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

const checkUrl = (value, label) => {
  checkMax(value, label, LIMITS.url);
  if (!isSafeUrl(value)) {
    throw badRequest(`${label} must be an https:// URL or a path starting with /.`);
  }
  return value;
};

export const requiredUrl = (body, field, label) =>
  checkUrl(requiredString(body, field, label, { max: LIMITS.url }), label);

/** Image fields: also http:// on localhost / 127.0.0.1 (shared/fields.js isImageUrl). */
export const requiredImageUrl = (body, field, label) => {
  const value = requiredString(body, field, label, { max: LIMITS.url });
  checkMax(value, label, LIMITS.url);
  if (!isImageUrl(value)) throw badRequest(`${label} must be an https:// URL or a path starting with /.`);
  return value;
};

export const optionalUrl = (body, field, label) => {
  const value = optionalString(body, field, { label, max: LIMITS.url });
  return value ? checkUrl(value, label) : "";
};

// Enum check for writes. Returns undefined when the field is absent. A stored
// legacy value outside the enum may be echoed back unchanged (the admin UI
// sends the current status with every update).
export const enumField = (body, field, allowed, { label = field, existing } = {}) => {
  const raw = body?.[field];
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw !== "string") throw badRequest(`${label} must be text.`);
  const value = raw.trim();
  if (allowed.includes(value) || (existing !== undefined && value === existing)) return value;
  throw badRequest(`${label} must be one of: ${allowed.join(", ")}.`);
};

export const normalizeSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, LIMITS.slug)
    .replace(/-+$/, "");

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** A sent, non-blank slug normalized; undefined when absent/blank (derive or keep). */
export const optionalSlug = (body) => {
  const raw = optionalString(body, "slug", { label: "Slug", max: LIMITS.slug });
  if (!raw) return undefined;
  const slug = normalizeSlug(raw);
  if (UUID_SHAPE.test(slug)) throw badRequest("Slug must not look like an id.");
  return slug || undefined;
};

/** Derived slug for a new record; a short random id when nothing usable is left. */
export const deriveSlug = (source) => normalizeSlug(source) || randomBytes(4).toString("hex");

// Password policy for reset/set (existing passwords still log in).
export const passwordPolicyError = (password, email = "") => {
  if (typeof password !== "string" || password.length === 0) return "New password is required.";
  if (password.length < LIMITS.passwordMin) {
    return `Password must be at least ${LIMITS.passwordMin} characters.`;
  }
  if (password.length > LIMITS.passwordMax) {
    return `Password must be ${LIMITS.passwordMax} characters or fewer.`;
  }
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const lowered = password.toLowerCase();
  const localPart = normalizedEmail.split("@")[0] || "";
  if (
    (normalizedEmail && lowered === normalizedEmail) ||
    (localPart.length >= 4 && lowered.includes(localPart))
  ) {
    return "Password must not contain your email address.";
  }
  return "";
};

export const validatePassword = (password, email = "") => {
  const error = passwordPolicyError(password, email);
  if (error) throw badRequest(error);
  return password;
};

// ---- pricing items (orders, carts, quotes) --------------------------------

const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const scalarWithin = (value, max) =>
  value === undefined ||
  value === null ||
  ((typeof value === "string" || (typeof value === "number" && Number.isFinite(value))) &&
    String(value).length <= max);

const ITEM_TEXT_FIELDS = ["kva", "volt", "type", "name", "optionName", "option"];
const ITEM_ID_FIELDS = ["id", "packageId", "legacyId"];

export const quantityField = (item) => {
  const raw = item?.quantity;
  if (raw === undefined || raw === null) return 1;
  const valid =
    (typeof raw === "number" && Number.isInteger(raw)) ||
    (typeof raw === "string" && /^\d+$/.test(raw));
  const quantity = valid ? Number(raw) : Number.NaN;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > LIMITS.quantityMax) {
    throw badRequest(`Quantity must be a whole number from 1 to ${LIMITS.quantityMax}.`);
  }
  return quantity;
};

/**
 * Shape-checks order/cart items before any matching or regex work.
 * Resolves to [{ item, quantity }].
 */
export const validatePricingItems = (items, kind = "order") => {
  const isOrder = kind === "order";
  if (!Array.isArray(items) || items.length === 0) {
    throw badRequest(isOrder ? "At least one order item is required." : "Cart items are required.");
  }
  const max = isOrder ? LIMITS.orderItems : LIMITS.cartItems;
  if (items.length > max) {
    throw badRequest(`${isOrder ? "An order" : "A cart"} can have at most ${max} items.`);
  }
  const invalid = () => badRequest(isOrder ? "Invalid order item." : "Invalid cart item.");
  return items.map((item) => {
    if (!isPlainObject(item)) throw invalid();
    // Product item (COMMERCE_V3 §3.1): only productId and quantity are read.
    if (item.type === "product") {
      const productId = typeof item.productId === "string" ? item.productId.trim() : "";
      if (!productId || productId.length > LIMITS.itemId) throw invalid();
      return { item, quantity: quantityField(item), productId };
    }
    if (
      !ITEM_TEXT_FIELDS.every((field) => scalarWithin(item[field], LIMITS.itemText)) ||
      !ITEM_ID_FIELDS.every((field) => scalarWithin(item[field], LIMITS.itemId)) ||
      !scalarWithin(item.package, LIMITS.itemPackage) ||
      !(
        item.withSolar === undefined ||
        item.withSolar === null ||
        typeof item.withSolar === "boolean" ||
        item.withSolar === "true" ||
        item.withSolar === "false"
      )
    ) {
      throw invalid();
    }
    return { item, quantity: quantityField(item) };
  });
};

export const conflict = (message) => new ApiError(409, message);
