/**
 * Website content (LANDING_V1, TEAM_AND_MOTION_V1): limits, field rules and list helpers for FAQs, reviews, client
 * logos, team members, the portfolio
 * case-study fields and the website, financing and calculator settings. Mirrors the contract; the server decides.
 */

export const WEBSITE_LIMITS = {
  faqQuestionMin: 5,
  faqQuestion: 200,
  faqAnswer: 2000,
  faqCategory: 60,
  reviewName: 100,
  reviewContext: 150,
  reviewQuoteMin: 10,
  reviewQuote: 1000,
  clientName: 100,
  reasonTitleMin: 3,
  reasonTitle: 80,
  reasonTextMin: 10,
  reasonText: 300,
  teamName: 100,
  teamRole: 80,
  teamGroup: 60,
  teamBio: 300,
  portfolioCategory: 60,
  portfolioSummary: 500,
  portfolioLocation: 100,
  portfolioSystem: 200,
  stats: 4,
  statLabel: 40,
  statValue: 20,
  businessHours: 200,
  financingTerms: 6,
  termMonthsMax: 60,
  monthlyRateMax: 20,
  approvalTime: 60,
  financingNote: 300,
  appliances: 40,
  applianceKey: 40,
  applianceLabel: 40,
  applianceWattsMax: 10000,
  applianceQuantityMax: 20,
  fuelPriceMax: 100000,
  litresPerKvaHourMax: 2,
  maintenanceMax: 10000000,
} as const;

export const SAMPLE_BANNER = "Sample content is showing on the website. Edit or replace it before launch.";

/** A site path such as `/samples/client-1.svg` (contract §1). */
export const SITE_PATH_REGEX = /^\/[A-Za-z0-9._/-]{1,200}$/;

/** Image and logo fields: an absolute http(s) URL or a site path. */
export const isImageLocation = (value: string) => {
  const text = value.trim();
  if (!text) return false;
  if (text.startsWith("/")) return SITE_PATH_REGEX.test(text) && !text.startsWith("//");
  if (!/^https?:\/\//i.test(text)) return false;
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

/** LinkedIn profile links: an absolute https URL (TEAM_AND_MOTION_V1 §1). */
export const httpsUrlError = (value: string, label: string) => {
  const text = value.trim();
  if (!text) return "";
  try {
    const url = new URL(text);
    return /^https:\/\//i.test(text) && url.protocol === "https:" && url.hostname && !/\s/.test(text)
      ? ""
      : `${label} must be an https URL.`;
  } catch {
    return `${label} must be an https URL.`;
  }
};

export const imageLocationError = (value: string, label: string, { required = false } = {}) => {
  if (!value.trim()) return required ? `${label} is required.` : "";
  return isImageLocation(value) ? "" : `${label} must be an http(s) URL or a site path starting with /.`;
};

/** Returns an error for a trimmed text field, or "". */
export const lengthError = (value: string, label: string, { min = 0, max }: { min?: number; max: number }) => {
  const text = value.trim();
  if (!text) return min > 0 ? `${label} is required.` : "";
  if (text.length < min) return `${label} must be at least ${min} characters.`;
  return text.length > max ? `${label} must be ${max} characters or fewer.` : "";
};

/** Drops empty messages so `Object.keys(errors).length` means "has errors". */
export const compactErrors = <K extends string>(errors: Record<K, string>) =>
  Object.fromEntries(Object.entries(errors).filter(([, message]) => message)) as Partial<Record<K, string>>;

export const blankToNull = (value: string) => value.trim() || null;

type Sortable = { sortOrder?: number | null; createdAt?: string | null };

/** Public order: `sortOrder`, then `createdAt` (contract §1). */
export const bySortOrder = (a: Sortable, b: Sortable) =>
  (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0) || String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""));

/**
 * Moves `id` one step up or down among `visibleIds` (the filtered list) and returns the new `sortOrder` for every
 * record in `all` whose position changed. Records keep their relative order outside the move.
 */
export const reorderUpdates = <T extends Sortable & { id: string }>(
  all: T[],
  visibleIds: string[],
  id: string,
  direction: -1 | 1
): { id: string; sortOrder: number }[] => {
  const position = visibleIds.indexOf(id);
  const neighbourId = visibleIds[position + direction];
  if (position < 0 || !neighbourId) return [];
  const ordered = [...all].sort(bySortOrder);
  const from = ordered.findIndex((item) => item.id === id);
  const to = ordered.findIndex((item) => item.id === neighbourId);
  if (from < 0 || to < 0) return [];
  [ordered[from], ordered[to]] = [ordered[to], ordered[from]];
  return ordered
    .map((item, index) => ({ id: item.id, sortOrder: index + 1, current: Number(item.sortOrder) || 0 }))
    .filter((item) => item.sortOrder !== item.current)
    .map(({ id: itemId, sortOrder }) => ({ id: itemId, sortOrder }));
};

/** Parses a number input; blank gives null, anything unparsable gives NaN. */
export const parseNumber = (value: string) => (value.trim() === "" ? null : Number(value));

/** Whole number from `min` to `max` (blank allowed unless `required`). */
export const integerError = (value: string, label: string, min: number, max: number, { required = true } = {}) => {
  const number = parseNumber(value);
  if (number === null) return required ? `Enter ${label.toLowerCase()}.` : "";
  return Number.isInteger(number) && number >= min && number <= max
    ? ""
    : `${label} must be a whole number from ${min} to ${max.toLocaleString("en-NG")}.`;
};

/** Number from `min` to `max` with at most `decimals` decimal places (and an optional step such as 0.5). */
export const decimalError = (
  value: string,
  label: string,
  min: number,
  max: number,
  { decimals, step, required = true }: { decimals: number; step?: number; required?: boolean }
) => {
  const number = parseNumber(value);
  if (number === null) return required ? `Enter ${label.toLowerCase()}.` : "";
  const places = (value.trim().split(".")[1] ?? "").length;
  if (!Number.isFinite(number) || number < min || number > max || places > decimals) {
    return `${label} must be from ${min} to ${max}${decimals ? ` with up to ${decimals} decimal place${decimals === 1 ? "" : "s"}` : ""}.`;
  }
  if (step && Math.abs(number / step - Math.round(number / step)) > 1e-9) return `${label} must be in steps of ${step}.`;
  return "";
};

/** Appliance key from its label: lowercase letters, digits and hyphens, unique within `taken`. */
export const applianceKey = (label: string, taken: Set<string>) => {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, WEBSITE_LIMITS.applianceKey - 3) || "appliance";
  let key = base;
  for (let suffix = 2; taken.has(key); suffix += 1) key = `${base}-${suffix}`;
  return key;
};
