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
