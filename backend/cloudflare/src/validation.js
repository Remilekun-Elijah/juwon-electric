// Input validation helpers. Every limit and message here mirrors the Express backend
// so both reject the same payloads with the same responses.
import { badRequest } from "./http.js";

export const LIMITS = {
  personName: 100,
  phoneNumber: 20,
  email: 254,
  emailLocal: 64,
  contactMessage: 5000,
  deliveryAddress: 500,
  source: 50,
  replySubject: 200,
  replyMessage: 10000,
  inboundMessage: 10000,
  inboundSubject: 998,
  inboundHtml: 200000,
  orderNote: 2000,
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
  orderItems: 50,
  cartItems: 50,
  packageOptions: 10,
  quantityMax: 100,
  optionPriceMax: 1000000000,
  sortOrderMax: 1000000,
  legacyIdMax: 1000000000,
  itemText: 50,
  itemPackage: 600,
  itemId: 64,
  pageMax: 100000,
  pageLimitMax: 100,
};

export const ORDER_STATUSES = ["pending", "completed", "cancelled"];
export const PAYMENT_STATUSES = ["unpaid", "partial", "paid", "refunded"];
export const CONTACT_STATUSES = ["new", "contacted", "completed"];
export const NEWSLETTER_STATUSES = ["new", "active", "inactive"];

const isMissing = (value) => value === undefined || value === null;

const tooLong = (label, max) => badRequest(`${label} must be ${max} characters or fewer.`);

// ---------------------------------------------------------------------------
// Control and format characters
// ---------------------------------------------------------------------------

// Single-line fields: no control (Cc) or format (Cf) characters at all.
const SINGLE_LINE_INVALID = /(?![\u200c\u200d])[\p{Cc}\p{Cf}]/u;
// Multi-line fields: tab, LF and CR are allowed.
const MULTI_LINE_INVALID = /(?![\u200c\u200d])\p{Cf}|(?![\u0009\u000a\u000d])\p{Cc}/u;
const SINGLE_LINE_INVALID_GLOBAL = /(?![\u200c\u200d])[\p{Cc}\p{Cf}]/gu;
const MULTI_LINE_INVALID_GLOBAL = /(?![\u200c\u200d])\p{Cf}|(?![\u0009\u000a\u000d])\p{Cc}/gu;

export const hasInvalidChars = (value, multiline = false) =>
  (multiline ? MULTI_LINE_INVALID : SINGLE_LINE_INVALID).test(value);

// Inbound email content is cleaned instead of rejected.
export const stripInvalidChars = (value, multiline = false) =>
  String(value ?? "").replace(multiline ? MULTI_LINE_INVALID_GLOBAL : SINGLE_LINE_INVALID_GLOBAL, "");

// ---------------------------------------------------------------------------
// Strings
// ---------------------------------------------------------------------------

// Returns a trimmed string ("" when absent). Only JSON strings are accepted.
// Order: type, trim, required, max length, invalid characters.
export const stringField = (body, key, { label = key, max, required = false, multiline = false } = {}) => {
  const raw = body?.[key];
  let value;
  if (isMissing(raw)) value = "";
  else if (typeof raw === "string") value = raw.trim();
  else badRequest(`${label} must be text.`);
  if (required && !value) badRequest(`${label} is required.`);
  if (max !== undefined && value.length > max) tooLong(label, max);
  if (value && hasInvalidChars(value, multiline)) badRequest(`${label} contains invalid characters.`);
  return value;
};

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

const NUMERIC_STRING = /^\d+(\.\d+)?$/;
const INTEGER_STRING = /^\d+$/;

// Numeric admin fields: a finite JSON number, or a plain decimal string ("12", "12.5").
// Hex, exponent, signed, whitespace-padded and whitespace-only strings are rejected.
// Absent (undefined/null) returns undefined, unless required. "" is rejected.
export const numericField = (body, key, { label = key, required = false, maxLength } = {}) => {
  const raw = body?.[key];
  if (isMissing(raw)) {
    if (required) badRequest(`${label} must be a number.`);
    return undefined;
  }
  let value;
  if (typeof raw === "number" && Number.isFinite(raw)) value = raw;
  else if (typeof raw === "string" && NUMERIC_STRING.test(raw)) value = Number(raw);
  else badRequest(`${label} must be a number.`);
  if (maxLength !== undefined && String(raw).length > maxLength) tooLong(label, maxLength);
  if (!Number.isFinite(value)) badRequest(`${label} must be a number.`);
  return value;
};

// Accepts true/false (and the strings "true"/"false" older admin clients send).
export const optionalBoolean = (body, key, fallback = false, label = key) => {
  const value = body?.[key];
  if (isMissing(value)) return fallback;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return badRequest(`${label} must be true or false.`);
};

// quantity: absent means 1; otherwise a JSON integer or a digits-only string, 1-100.
export const quantityField = (item, label = "Quantity") => {
  const raw = item?.quantity;
  if (isMissing(raw)) return 1;
  const message = `${label} must be a whole number from 1 to ${LIMITS.quantityMax}.`;
  let quantity;
  if (typeof raw === "number") quantity = raw;
  else if (typeof raw === "string" && INTEGER_STRING.test(raw)) quantity = Number(raw);
  else badRequest(message);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > LIMITS.quantityMax) badRequest(message);
  return quantity;
};

// ---------------------------------------------------------------------------
// Email and phone
// ---------------------------------------------------------------------------

// Shared with the Express backend and the frontend (fix plan B4).
export const EMAIL_PATTERN =
  /^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,63}$/;

export const isValidEmail = (email) => {
  if (typeof email !== "string" || email.length > LIMITS.email || !EMAIL_PATTERN.test(email)) return false;
  const local = email.slice(0, email.indexOf("@"));
  return !local.startsWith(".") && !local.endsWith(".") && !local.includes("..");
};

export const validateEmail = (value, { required = false, label = "Email address" } = {}) => {
  if (!isMissing(value) && typeof value !== "string") badRequest(`${label} must be text.`);
  const email = String(value ?? "").trim().toLowerCase();
  if (!email) {
    if (required) badRequest("A valid email address is required.");
    return "";
  }
  if (email.length > LIMITS.email) tooLong(label, LIMITS.email);
  if (!isValidEmail(email)) badRequest("A valid email address is required.");
  return email;
};

export const emailField = (body, key, options = {}) =>
  validateEmail(stringField(body, key, { label: options.label || "Email address" }), options);

const PHONE_PATTERN = /^\+?[0-9 ()-]+$/;

// Stores the trimmed original; only validates its shape and digit count.
export const phoneField = (body, key, { required = false, label = "Phone number" } = {}) => {
  const value = stringField(body, key, { label, required, max: LIMITS.phoneNumber });
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (!PHONE_PATTERN.test(value) || digits.length < 10 || digits.length > 15) {
    badRequest("Enter a valid phone number.");
  }
  return value;
};

// ---------------------------------------------------------------------------
// URLs, enums, arrays
// ---------------------------------------------------------------------------

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

export const urlField = (body, key, { label, required = false } = {}) => {
  const value = stringField(body, key, { label, required, max: LIMITS.url });
  if (value && !isSafeUrl(value)) badRequest(`${label} must be an https:// URL or a path starting with /.`);
  return value;
};

// Enum check that lets an existing legacy value be echoed back unchanged.
export const enumField = (body, key, allowed, { label, existing } = {}) => {
  const raw = body?.[key];
  if (isMissing(raw) || raw === "") return undefined;
  if (typeof raw !== "string") badRequest(`${label} must be text.`);
  const value = raw.trim();
  if (allowed.includes(value) || (existing !== undefined && value === existing)) return value;
  return badRequest(`${label} must be one of: ${allowed.join(", ")}.`);
};

export const slugField = (body, key = "slug") => stringField(body, key, { label: "Slug", max: LIMITS.slug });

// Paging (fix plan B7): page 1-100000, limit >= 1 and capped at 100.
export const pageParams = (params, defaultLimit = 50) => {
  const pageRaw = params.get("page");
  const limitRaw = params.get("limit");
  let page = 1;
  if (pageRaw !== null && pageRaw !== "") {
    page = INTEGER_STRING.test(pageRaw) ? Number(pageRaw) : NaN;
    if (!Number.isSafeInteger(page) || page < 1 || page > LIMITS.pageMax) {
      badRequest(`page must be a whole number from 1 to ${LIMITS.pageMax}.`);
    }
  }
  let limit = defaultLimit;
  if (limitRaw !== null && limitRaw !== "") {
    limit = INTEGER_STRING.test(limitRaw) && limitRaw.length <= 15 ? Number(limitRaw) : NaN;
    if (!Number.isSafeInteger(limit) || limit < 1) badRequest("limit must be a positive whole number.");
  }
  return { page, limit: Math.min(limit, LIMITS.pageLimitMax) };
};

// ---------------------------------------------------------------------------
// Order / cart items (fix plan B1): shape checks before any matching
// ---------------------------------------------------------------------------

const ITEM_TEXT_FIELDS = ["kva", "volt", "type", "name", "optionName", "option"];
const ITEM_ID_FIELDS = ["id", "packageId", "legacyId"];

const isTextOrNumber = (value, max) =>
  (typeof value === "string" || (typeof value === "number" && Number.isFinite(value))) && String(value).length <= max;

export const validateItems = (items, kind) => {
  const isOrder = kind === "order";
  const invalid = isOrder ? "Invalid order item." : "Invalid cart item.";
  if (!Array.isArray(items) || items.length === 0) {
    badRequest(isOrder ? "At least one order item is required." : "Cart items are required.");
  }
  const max = isOrder ? LIMITS.orderItems : LIMITS.cartItems;
  if (items.length > max) {
    badRequest(isOrder ? `An order can have at most ${max} items.` : `A cart can have at most ${max} items.`);
  }
  return items.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) badRequest(invalid);
    for (const key of ITEM_TEXT_FIELDS) {
      if (!isMissing(item[key]) && !isTextOrNumber(item[key], LIMITS.itemText)) badRequest(invalid);
    }
    for (const key of ITEM_ID_FIELDS) {
      if (!isMissing(item[key]) && !isTextOrNumber(item[key], LIMITS.itemId)) badRequest(invalid);
    }
    if (!isMissing(item.package) && (typeof item.package !== "string" || item.package.length > LIMITS.itemPackage)) {
      badRequest(invalid);
    }
    if (!isMissing(item.withSolar) && ![true, false, "true", "false"].includes(item.withSolar)) badRequest(invalid);
    return { item, quantity: quantityField(item) };
  });
};

// ---------------------------------------------------------------------------
// Passwords and secrets
// ---------------------------------------------------------------------------

export const validateNewPassword = (password, email) => {
  if (typeof password !== "string" || !password) badRequest("New password is required.");
  if (password.length < LIMITS.passwordMin) {
    badRequest(`Password must be at least ${LIMITS.passwordMin} characters.`);
  }
  if (password.length > LIMITS.passwordMax) {
    badRequest(`Password must be ${LIMITS.passwordMax} characters or fewer.`);
  }
  const lowered = password.toLowerCase();
  const normalizedEmail = String(email || "").toLowerCase();
  const localPart = normalizedEmail.split("@")[0] || "";
  if (
    (normalizedEmail && lowered === normalizedEmail) ||
    (localPart.length >= 4 && lowered.includes(localPart))
  ) {
    badRequest("Password must not contain your email address.");
  }
  return password;
};

// Same policy, as a boolean (used for the super admin seed).
export const passwordMeetsPolicy = (password, email) => {
  try {
    validateNewPassword(password, email);
    return !/^replace-with/i.test(password);
  } catch {
    return false;
  }
};

const PLACEHOLDER_SECRET = /^(replace-with|change-me|example)/i;
export const SECRET_MIN_LENGTH = 32;

export const isUsableSecret = (value) =>
  typeof value === "string" && value.length >= SECRET_MIN_LENGTH && !PLACEHOLDER_SECRET.test(value);
