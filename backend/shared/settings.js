import { badRequest } from "./errors.js";
import { OPS_LIMITS, boolean, email, emailList, integer, isPlainObject, list, number, phone, text, url } from "./fields.js";

// Global settings document (API_CONTRACT_V3 §8.1): collection `settings`, fixed id
// "global". Readers merge the stored document over DEFAULT_SETTINGS, so a missing document
// or section behaves like the defaults.

export const SETTINGS_ID = "global";

export const PAYMENT_PROVIDERS = ["paystack", "flutterwave"];

// UPLOADS_V1 §7: stored only; never shown in the admin. Uploads depend on server configuration.
export const UPLOAD_PROVIDERS = ["url", "r2"];

export const DEFAULT_SETTINGS = Object.freeze({
  business: { name: "Juwon Electric", email: null, phone: null, address: null, website: null },
  notifications: { orderEmails: [], lowStockEmails: [], vacancyEmails: [] },
  payments: { gatewayEnabled: false, provider: null },
  inventory: { defaultReorderLevel: 0, lowStockAlertsEnabled: true },
  uploads: { provider: "url" },
  // LANDING_V1 §3. `sample` marks seeded sample content; saving a section clears it.
  // `productsEnabled` false hides the Products area of the public site (packages are unaffected).
  website: { stats: [], whatsappNumber: null, businessHours: null, productsEnabled: true, sample: false },
  financing: {
    enabled: false,
    depositPercent: null,
    termsMonths: [],
    monthlyRatePercent: null,
    approvalTime: null,
    note: null,
    sample: false,
  },
  calculator: {
    enabled: false,
    appliances: [],
    inverterHeadroomPercent: 25,
    batteryDepthOfDischargePercent: 80,
    batteryVoltage: 48,
    panelWatts: 550,
    peakSunHours: 4.5,
    generator: { fuelPricePerLitre: 0, litresPerKvaHour: 0, maintenancePerMonth: 0 },
    sample: false,
  },
});

/** Sections whose `sample` flag is cleared when the section is saved. */
export const SAMPLE_SECTIONS = ["website", "financing", "calculator"];

export const SETTINGS_LIMITS = {
  stats: 4,
  statLabel: 40,
  statValue: 20,
  businessHours: 200,
  terms: 6,
  termMonthsMax: 60,
  monthlyRateMax: 20,
  approvalTime: 60,
  financingNote: 300,
  appliances: 40,
  applianceKey: 40,
  applianceLabel: 40,
  applianceWattsMax: 10_000,
  applianceHoursMax: 24,
  applianceQuantityMax: 20,
  fuelPriceMax: 100_000,
  litresPerKvaHourMax: 2,
  maintenanceMax: 10_000_000,
};

export const BATTERY_VOLTAGES = [12, 24, 48];

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

const APPLIANCE_KEY = /^[a-z0-9-]{1,40}$/;

const requiredBoolean = (source, key, label) => {
  const value = boolean(source, key, { label });
  if (value === undefined) throw badRequest(`${label} must be true or false.`);
  return value;
};

/** `value` when it has at most `places` decimal places. */
const decimals = (value, places, label) => {
  const scaled = value * 10 ** places;
  if (Math.abs(scaled - Math.round(scaled)) > 1e-9) {
    throw badRequest(`${label} can have at most ${places} decimal ${places === 1 ? "place" : "places"}.`);
  }
  return value;
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
      if (!UPLOAD_PROVIDERS.includes(source.provider)) throw badRequest("Upload provider is not valid.");
      return source.provider;
    },
  },
  website: {
    stats: (source) =>
      list(source, "stats", {
        label: "Stats",
        max: SETTINGS_LIMITS.stats,
        each: (entry) => {
          if (!isPlainObject(entry)) throw badRequest("Each stat must have a label and a value.");
          return {
            label: text(entry, "label", { label: "Stat label", required: true, max: SETTINGS_LIMITS.statLabel }),
            value: text(entry, "value", { label: "Stat value", required: true, max: SETTINGS_LIMITS.statValue }),
          };
        },
      }),
    whatsappNumber: (source) =>
      source.whatsappNumber === null ? null : phone(source, "whatsappNumber", { label: "WhatsApp number" }) || null,
    businessHours: (source) =>
      text(source, "businessHours", { label: "Business hours", max: SETTINGS_LIMITS.businessHours, multiline: true }) || null,
    productsEnabled: (source) => requiredBoolean(source, "productsEnabled", "Products on the website"),
  },
  financing: {
    enabled: (source) => requiredBoolean(source, "enabled", "Financing enabled"),
    depositPercent: (source) =>
      source.depositPercent === "" ? null : integer(source, "depositPercent", { label: "Deposit percent", min: 0, max: 100 }) ?? null,
    termsMonths: (source) => {
      const values = list(source, "termsMonths", {
        label: "Terms",
        max: SETTINGS_LIMITS.terms,
        each: (entry) =>
          integer({ value: entry }, "value", {
            label: "Each term",
            required: true,
            min: 1,
            max: SETTINGS_LIMITS.termMonthsMax,
          }),
      });
      return [...new Set(values)].sort((a, b) => a - b);
    },
    monthlyRatePercent: (source) => {
      if (source.monthlyRatePercent === "") return null;
      const value = number(source, "monthlyRatePercent", { label: "Monthly rate", min: 0, max: SETTINGS_LIMITS.monthlyRateMax });
      return value === undefined ? null : decimals(value, 2, "Monthly rate");
    },
    approvalTime: (source) => text(source, "approvalTime", { label: "Approval time", max: SETTINGS_LIMITS.approvalTime }) || null,
    note: (source) =>
      text(source, "note", { label: "Financing note", max: SETTINGS_LIMITS.financingNote, multiline: true }) || null,
  },
  calculator: {
    enabled: (source) => requiredBoolean(source, "enabled", "Calculator enabled"),
    appliances: (source) => {
      const keys = new Set();
      return list(source, "appliances", {
        label: "Appliances",
        max: SETTINGS_LIMITS.appliances,
        each: (entry) => {
          if (!isPlainObject(entry)) throw badRequest("Each appliance must be an object.");
          const key = text(entry, "key", { label: "Appliance key", required: true, max: SETTINGS_LIMITS.applianceKey });
          if (!APPLIANCE_KEY.test(key)) {
            throw badRequest("Appliance key must contain only lowercase letters, numbers and hyphens.");
          }
          if (keys.has(key)) throw badRequest(`Appliance key "${key}" is used more than once.`);
          keys.add(key);
          const defaultHours = number(entry, "defaultHours", {
            label: "Default hours",
            required: true,
            min: 0,
            max: SETTINGS_LIMITS.applianceHoursMax,
          });
          if (!Number.isInteger(defaultHours * 2)) throw badRequest("Default hours must be in steps of 0.5.");
          return {
            key,
            label: text(entry, "label", { label: "Appliance label", required: true, max: SETTINGS_LIMITS.applianceLabel }),
            watts: integer(entry, "watts", { label: "Watts", required: true, min: 1, max: SETTINGS_LIMITS.applianceWattsMax }),
            defaultHours,
            defaultQuantity: integer(entry, "defaultQuantity", {
              label: "Default quantity",
              required: true,
              min: 0,
              max: SETTINGS_LIMITS.applianceQuantityMax,
            }),
          };
        },
      });
    },
    inverterHeadroomPercent: (source) =>
      integer(source, "inverterHeadroomPercent", { label: "Inverter headroom", required: true, min: 0, max: 100 }),
    batteryDepthOfDischargePercent: (source) =>
      integer(source, "batteryDepthOfDischargePercent", { label: "Battery depth of discharge", required: true, min: 10, max: 100 }),
    batteryVoltage: (source) => {
      const value = integer(source, "batteryVoltage", { label: "Battery voltage", required: true });
      if (!BATTERY_VOLTAGES.includes(value)) throw badRequest("Battery voltage must be 12, 24 or 48.");
      return value;
    },
    panelWatts: (source) => integer(source, "panelWatts", { label: "Panel watts", required: true, min: 100, max: 1000 }),
    peakSunHours: (source) =>
      decimals(number(source, "peakSunHours", { label: "Peak sun hours", required: true, min: 1, max: 10 }), 1, "Peak sun hours"),
    generator: (source, current) => {
      if (!isPlainObject(source.generator)) throw badRequest("Generator must be an object.");
      const input = source.generator;
      const pick = (key, parse) => (input[key] === undefined ? current.generator[key] : parse());
      return {
        fuelPricePerLitre: pick("fuelPricePerLitre", () =>
          integer(input, "fuelPricePerLitre", { label: "Fuel price", required: true, min: 0, max: SETTINGS_LIMITS.fuelPriceMax })
        ),
        litresPerKvaHour: pick("litresPerKvaHour", () =>
          decimals(
            number(input, "litresPerKvaHour", { label: "Litres per kVA-hour", required: true, min: 0, max: SETTINGS_LIMITS.litresPerKvaHourMax }),
            2,
            "Litres per kVA-hour"
          )
        ),
        maintenancePerMonth: pick("maintenancePerMonth", () =>
          integer(input, "maintenancePerMonth", { label: "Maintenance per month", required: true, min: 0, max: SETTINGS_LIMITS.maintenanceMax })
        ),
      };
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
      const value = parse(source, next[section]);
      if (JSON.stringify(value) !== JSON.stringify(next[section][key])) changes.push(`${section}.${key}`);
      next[section][key] = value;
    }
    // Changing a sample section makes it real content (LANDING_V1 §0). Re-saving it unchanged, for example
    // when another section is saved from the same page, keeps its Sample label.
    const sectionChanged = changes.some((key) => key.startsWith(`${section}.`));
    if (SAMPLE_SECTIONS.includes(section) && sectionChanged && next[section].sample !== false) {
      next[section].sample = false;
      changes.push(`${section}.sample`);
    }
  }
  return { settings: next, changes };
};

/** GET /settings/public: business details, the payment toggle and the website sections (never notification emails). */
export const publicSettings = (settings) => ({
  business: {
    name: settings.business.name,
    phone: settings.business.phone,
    email: settings.business.email,
    address: settings.business.address,
    website: settings.business.website,
  },
  payments: { gatewayEnabled: settings.payments.gatewayEnabled },
  // LANDING_V1 §3: website always; financing and calculator in full only when enabled.
  website: { ...settings.website },
  financing: settings.financing.enabled === true ? { ...settings.financing } : { enabled: false },
  calculator: settings.calculator.enabled === true ? { ...settings.calculator } : { enabled: false },
});

/** Stored document for a merged settings object. */
export const settingsDocument = (settings, actor, timestamp) => {
  const document = Object.fromEntries(SETTINGS_SECTIONS.map((section) => [section, settings[section]]));
  return { ...document, updatedBy: actor ? { id: actor.id, email: actor.email } : null, updatedAt: timestamp };
};

/** Recipients for a settings email list, or `fallback` when the list is empty. */
export const recipientsOr = (list, fallback) => (Array.isArray(list) && list.length ? list : fallback);
