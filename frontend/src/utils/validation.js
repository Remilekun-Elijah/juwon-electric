// Client-side mirrors of the backend limits and rules (see backend/docs/API.md).
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
  cartItems: 50,
  quantityMin: 1,
  quantityMax: 100,
};

/* ---------- Email addresses ---------- */

// Shared with both backends (fix plan B4). No `g` flag: a shared global regex would carry
// lastIndex between test() calls.
export const EMAIL_REGEX =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,63}$/;

/** Mirrors the server: trimmed, at most 254 characters, the shared regex, and no leading, trailing or consecutive dots in the local part. */
export const isValidEmail = (value) => {
  if (typeof value !== "string") return false;
  const email = value.trim();
  if (!email || email.length > LIMITS.email || !EMAIL_REGEX.test(email)) return false;
  const local = email.slice(0, email.lastIndexOf("@"));
  return !local.startsWith(".") && !local.endsWith(".") && !local.includes("..");
};

/* ---------- Phone numbers ---------- */

export const PHONE_MESSAGE = "Enter a valid phone number.";

// Digits, spaces, - ( ) and one optional leading +, with 10–15 digits in total.
// Used as the HTML `pattern` attribute (browsers anchor it and compile it with the `v` flag).
export const PHONE_PATTERN = String.raw`(?=(?:\D*\d){10,15}\D*$)\+?[\d \(\)\-]+`;

export const isValidPhone = (value) => {
  const phone = String(value ?? "").trim();
  if (!/^\+?[\d ()-]+$/.test(phone)) return false;
  const digits = phone.replace(/\D/g, "").length;
  return digits >= 10 && digits <= 15;
};

/* ---------- URL fields (image, link, ctaUrl) ---------- */

export const urlFieldMessage = (label) => `${label} must be an https:// URL or a path starting with /.`;

// eslint-disable-next-line no-control-regex
const controlOrWhitespace = /[\u0000-\u001f\u007f\s]/;

export const isAllowedUrl = (value) => {
  const url = String(value ?? "").trim();
  if (!url || url.length > LIMITS.url) return false;
  if (url.startsWith("/")) {
    return !url.startsWith("//") && !url.includes("\\") && !controlOrWhitespace.test(url);
  }
  if (!/^https:\/\//i.test(url)) return false;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
};

/** Returns an error message for an URL field, or "" when valid. Empty values are allowed unless `required`. */
export const validateUrlField = (value, label, { required = false } = {}) => {
  const url = String(value ?? "").trim();
  if (!url) return required ? `${label} is required.` : "";
  return isAllowedUrl(url) ? "" : urlFieldMessage(label);
};

/* ---------- Admin passwords ---------- */

/** Returns an error message for a new admin password, or "" when it meets the policy. */
export const validateNewPassword = (password, email) => {
  const value = String(password ?? "");
  if (value.length < LIMITS.passwordMin) return `Password must be at least ${LIMITS.passwordMin} characters.`;
  if (value.length > LIMITS.passwordMax) return `Password must be ${LIMITS.passwordMax} characters or fewer.`;

  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  const lowerPassword = value.toLowerCase();
  const localPart = normalizedEmail.split("@")[0] || "";
  if (normalizedEmail && lowerPassword === normalizedEmail) {
    return "Password can’t be the same as your email address.";
  }
  if (localPart.length >= 4 && lowerPassword.includes(localPart)) {
    return "Password can’t contain the part of your email address before the @.";
  }
  return "";
};
