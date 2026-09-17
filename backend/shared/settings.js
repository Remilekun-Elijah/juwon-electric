import { badRequest } from "./errors.js";
import { OPS_LIMITS, boolean, email, emailList, integer, phone, text, url } from "./fields.js";

// Global settings document (API_CONTRACT_V3 §8.1): collection `settings`, fixed id
// "global". Readers merge the stored document over DEFAULT_SETTINGS, so a missing document
// or section behaves like the defaults.

export const SETTINGS_ID = "global";

export const PAYMENT_PROVIDERS = ["paystack", "flutterwave"];

export const DEFAULT_SETTINGS = Object.freeze({
  business: { name: "Juwon Electric", email: null, phone: null, address: null, website: null },
  notifications: { orderEmails: [], lowStockEmails: [], vacancyEmails: [] },
  payments: { gatewayEnabled: false, provider: null },
  inventory: { defaultReorderLevel: 0, lowStockAlertsEnabled: true },
  uploads: { provider: "url" },
});

export const SETTINGS_SECTIONS = Object.keys(DEFAULT_SETTINGS);

const clone = (value) => JSON.parse(JSON.stringify(value));

/** Settings as returned by GET /admin/settings: stored values over defaults, known keys only. */
export const mergeSettings = (stored) => {
  const merged = clone(DEFAULT_SETTINGS);
  for (const section of SETTINGS_SECTIONS) {
    const source = stored?.[section];
    if (!source || typeof source !== "object" || Array.isArray(source)) continue;
    for (const key of Object.keys(merged[section])) {
      if (source[key] !== undefined) merged[section][key] = source[key];
    }
  }
  return { ...merged, updatedAt: stored?.updatedAt ?? null, updatedBy: stored?.updatedBy ?? null };
};

// ---- PUT /admin/settings --------------------------------------------------------------------

const MESSAGES = {
  section: (name) => `${name} must be an object.`,
};

const nullableText = (source, key, label, max) => text(source, key, { label, max, multiline: key === "address" }) || null;

const SECTION_FIELDS = {
  business: {
    name: (source) => text(source, "name", { label: "Business name", required: true, max: OPS_LIMITS.businessName }),
    email: (source) => email(source, "email", { label: "Business email" }) || null,
    phone: (source) => (source.phone === null ? null : phone(source, "phone") || null),
    address: (source) => nullableText(source, "address", "Business address", OPS_LIMITS.address),
    website: (source) => url(source, "website", { label: "Website" }) || null,
  },
  notifications: {
    orderEmails: (source) => emailList(source, "orderEmails", { label: "Order emails" }) ?? [],
    lowStockEmails: (source) => emailList(source, "lowStockEmails", { label: "Low-stock emails" }) ?? [],
    vacancyEmails: (source) => emailList(source, "vacancyEmails", { label: "Vacancy emails" }) ?? [],
  },
  payments: {
    gatewayEnabled: (source) => {
      const value = boolean(source, "gatewayEnabled", { label: "gatewayEnabled" });
      if (value === undefined) throw badRequest("gatewayEnabled must be true or false.");
      return value;
    },
    provider: (source) => {
      if (source.provider === null) return null;
      if (!PAYMENT_PROVIDERS.includes(source.provider)) throw badRequest("Payment provider is not valid.");
      return source.provider;
    },
  },
  inventory: {
    defaultReorderLevel: (source) =>
      integer(source, "defaultReorderLevel", { label: "Default reorder level", required: true, min: 0, max: 1_000_000 }),
    lowStockAlertsEnabled: (source) => {
      const value = boolean(source, "lowStockAlertsEnabled", { label: "lowStockAlertsEnabled" });
      if (value === undefined) throw badRequest("lowStockAlertsEnabled must be true or false.");
      return value;
    },
  },
  uploads: {
    provider: (source) => {
      if (source.provider !== "url") throw badRequest("Upload provider is not valid.");
      return "url";
    },
  },
};

/**
 * Validates a PUT body against the current settings: sent sections are merged key by key,
 * sent arrays replace, unknown sections and keys are ignored. Returns { settings, changes }
 * where `changes` lists dotted keys whose values changed.
 */
export const planSettingsUpdate = (current, body) => {
  const input = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const next = JSON.parse(JSON.stringify(current));
  const changes = [];
  for (const section of SETTINGS_SECTIONS) {
    if (input[section] === undefined) continue;
    const source = input[section];
    if (!source || typeof source !== "object" || Array.isArray(source)) throw badRequest(MESSAGES.section(section));
    for (const [key, parse] of Object.entries(SECTION_FIELDS[section])) {
      if (source[key] === undefined) continue;
      const value = parse(source);
      if (JSON.stringify(value) !== JSON.stringify(next[section][key])) changes.push(`${section}.${key}`);
      next[section][key] = value;
    }
  }
  return { settings: next, changes };
};

/** GET /settings/public: business details and the payment toggle only (never notification emails). */
export const publicSettings = (settings) => ({
  business: {
    name: settings.business.name,
    phone: settings.business.phone,
    email: settings.business.email,
    address: settings.business.address,
    website: settings.business.website,
  },
  payments: { gatewayEnabled: settings.payments.gatewayEnabled },
});

/** Stored document for a merged settings object. */
export const settingsDocument = (settings, actor, timestamp) => {
  const document = Object.fromEntries(SETTINGS_SECTIONS.map((section) => [section, settings[section]]));
  return { ...document, updatedBy: actor ? { id: actor.id, email: actor.email } : null, updatedAt: timestamp };
};

/** Recipients for a settings email list, or `fallback` when the list is empty. */
export const recipientsOr = (list, fallback) => (Array.isArray(list) && list.length ? list : fallback);
