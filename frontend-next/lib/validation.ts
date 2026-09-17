// Client-side mirrors of the backend limits and rules (port of frontend/src/utils/validation.js, public parts).
// The server is the source of truth; these only give earlier, friendlier feedback.

export const LIMITS = {
  personName: 100,
  phoneNumber: 20,
  email: 254,
  contactMessage: 5000,
  deliveryAddress: 500,
  cartItems: 50,
  quantityMin: 1,
  quantityMax: 100,
} as const;

// Shared with both backends. No `g` flag: a shared global regex would carry lastIndex between test() calls.
export const EMAIL_REGEX =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,63}$/;

/** Trimmed, at most 254 characters, the shared regex, and no leading, trailing or consecutive dots in the local part. */
export const isValidEmail = (value: unknown) => {
  if (typeof value !== "string") return false;
  const email = value.trim();
  if (!email || email.length > LIMITS.email || !EMAIL_REGEX.test(email)) return false;
  const local = email.slice(0, email.lastIndexOf("@"));
  return !local.startsWith(".") && !local.endsWith(".") && !local.includes("..");
};

export const PHONE_MESSAGE = "Enter a valid phone number.";

// Digits, spaces, - ( ) and one optional leading +, with 10–15 digits in total.
// Used as the HTML `pattern` attribute (browsers anchor it and compile it with the `v` flag).
export const PHONE_PATTERN = String.raw`(?=(?:\D*\d){10,15}\D*$)\+?[\d \(\)\-]+`;

export const isValidPhone = (value: unknown) => {
  const phone = String(value ?? "").trim();
  if (!/^\+?[\d ()-]+$/.test(phone)) return false;
  const digits = phone.replace(/\D/g, "").length;
  return digits >= 10 && digits <= 15;
};
