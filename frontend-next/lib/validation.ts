// Client-side mirrors of the backend limits and rules (see backend/docs/API.md and API_CONTRACT_V3).
// The server is the source of truth; these only give earlier, friendlier feedback.

export const LIMITS = {
  personName: 100,
  phoneNumber: 20,
  email: 254,
  contactMessage: 5000,
  deliveryAddress: 500,
  replySubject: 200,
  replyMessage: 10000,
  packageName: 100,
  packageType: 50,
  packageLoad: 1000,
  packageKva: 20,
  packageVolt: 20,
  packageOptions: 10,
  optionName: 100,
  optionKits: 500,
  optionPriceMax: 1_000_000_000,
  serviceTitle: 150,
  serviceSubtitle: 500,
  serviceCtaLabel: 50,
  portfolioName: 150,
  url: 2048,
  passwordMin: 12,
  passwordMax: 128,
  resetToken: 256,
  orderNote: 2000,
  // API_CONTRACT_V3
  vacancyTitle: 150,
  vacancySlug: 120,
  vacancyShortText: 100,
  vacancyListItems: 30,
  vacancyListItem: 300,
  categoryName: 100,
  categoryDescription: 1000,
  categoryAttributes: 30,
  attributeLabel: 100,
  attributeUnit: 20,
  productName: 150,
  productSku: 64,
  productBrand: 100,
  productImages: 10,
  productTags: 20,
  productTag: 50,
  productAttributeValue: 200,
  priceMax: 1_000_000_000,
  stockMax: 1_000_000,
  movementNote: 500,
  jobChecklistItems: 50,
  jobChecklistLabel: 200,
  jobPhotos: 20,
  jobNotes: 2000,
  jobCompletionNotes: 5000,
  staffAreas: 20,
  staffArea: 100,
  staffCertifications: 20,
  staffCertification: 150,
  staffBio: 1000,
  settingsEmails: 10,
  cartItems: 50,
  quantityMin: 1,
  quantityMax: 100,
} as const;

/* ---------- Email addresses ---------- */

// No `g` flag: a shared global regex would carry lastIndex between test() calls.
export const EMAIL_REGEX =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,63}$/;

/** Mirrors the server: trimmed, at most 254 characters, the shared regex, and no leading, trailing or consecutive dots in the local part. */
export const isValidEmail = (value: unknown): boolean => {
  if (typeof value !== "string") return false;
  const email = value.trim();
  if (!email || email.length > LIMITS.email || !EMAIL_REGEX.test(email)) return false;
  const local = email.slice(0, email.lastIndexOf("@"));
  return !local.startsWith(".") && !local.endsWith(".") && !local.includes("..");
};

/* ---------- Phone numbers ---------- */

export const PHONE_MESSAGE = "Enter a valid phone number.";

export const isValidPhone = (value: unknown): boolean => {
  const phone = String(value ?? "").trim();
  if (!/^\+?[\d ()-]+$/.test(phone)) return false;
  const digits = phone.replace(/\D/g, "").length;
  return digits >= 10 && digits <= 15;
};

/* ---------- URL fields ---------- */

export const urlFieldMessage = (label: string) => `${label} must be an https:// URL or a path starting with /.`;

const hasControlOrWhitespace = (value: string) =>
  [...value].some((char) => {
    const code = char.charCodeAt(0);
    return code <= 0x1f || code === 0x7f || /\s/.test(char);
  });

export const isAllowedUrl = (value: unknown): boolean => {
  const url = String(value ?? "").trim();
  if (!url || url.length > LIMITS.url) return false;
  if (url.startsWith("/")) return !url.startsWith("//") && !url.includes("\\") && !hasControlOrWhitespace(url);
  if (!/^https:\/\//i.test(url)) return false;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
};

/** Returns an error message for a URL field, or "" when valid. Empty values are allowed unless `required`. */
export const validateUrlField = (value: unknown, label: string, { required = false } = {}) => {
  const url = String(value ?? "").trim();
  if (!url) return required ? `${label} is required.` : "";
  return isAllowedUrl(url) ? "" : urlFieldMessage(label);
};

/* ---------- Admin passwords ---------- */

/** Returns an error message for a new admin password, or "" when it meets the policy. */
export const validateNewPassword = (password: unknown, email: unknown) => {
  const value = String(password ?? "");
  if (value.length < LIMITS.passwordMin) return `Password must be at least ${LIMITS.passwordMin} characters.`;
  if (value.length > LIMITS.passwordMax) return `Password must be ${LIMITS.passwordMax} characters or fewer.`;

  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  const lowerPassword = value.toLowerCase();
  const localPart = normalizedEmail.split("@")[0] || "";
  if (normalizedEmail && lowerPassword === normalizedEmail) return "Password can’t be the same as your email address.";
  if (localPart.length >= 4 && lowerPassword.includes(localPart)) {
    return "Password can’t contain the part of your email address before the @.";
  }
  return "";
};

/** Splits a textarea into trimmed, non-empty lines (requirements, checklist items, tags). */
export const linesOf = (value: string) =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

// Digits, spaces, - ( ) and one optional leading +, with 10–15 digits in total.
// Used as the HTML `pattern` attribute (browsers anchor it and compile it with the `v` flag).
export const PHONE_PATTERN = String.raw`(?=(?:\D*\d){10,15}\D*$)\+?[\d \(\)\-]+`;
