// Global settings document (PRD §6.7): stored once, id "global", in the `settings`
// collection. Readers always merge the stored document over DEFAULT_SETTINGS, so a
// missing document or section behaves like the defaults.

export const SETTINGS_ID = "global";

export const PAYMENT_PROVIDERS = ["none", "paystack", "flutterwave"];

export const DEFAULT_SETTINGS = Object.freeze({
  business: { name: "Juwon Electric", email: "", phoneNumber: "", address: "", website: "" },
  notificationEmails: { orders: [], lowStock: [], vacancies: [] },
  payments: { gatewayEnabled: false, provider: "none" },
  inventory: { defaultReorderLevel: 5, lowStockDigestEnabled: true },
});

const SECTIONS = Object.keys(DEFAULT_SETTINGS);

const clone = (value) => JSON.parse(JSON.stringify(value));

/** Stored document (or null) merged over the defaults, known sections and keys only. */
export const mergeSettings = (stored) => {
  const merged = clone(DEFAULT_SETTINGS);
  for (const section of SECTIONS) {
    const source = stored?.[section];
    if (!source || typeof source !== "object" || Array.isArray(source)) continue;
    for (const key of Object.keys(merged[section])) {
      if (source[key] !== undefined && source[key] !== null) merged[section][key] = source[key];
    }
  }
  return { id: SETTINGS_ID, ...merged, updatedAt: stored?.updatedAt ?? null, updatedBy: stored?.updatedBy ?? null };
};
