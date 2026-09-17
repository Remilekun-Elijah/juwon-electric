/**
 * Catalog content (packages, services, portfolio) shapes, empty models and client-side validation.
 * Ported from the Vite admin (`constants/adminConstants.js` and `components/ContentManager.jsx`); the server is the
 * source of truth for every rule (backend/docs/API.md).
 */
import type { PackageOptionInput } from "@/lib/api/types";
import type { PackageOptionRecord } from "@/lib/admin/packageOptions";
import { LIMITS, validateUrlField } from "@/lib/validation";

export type ContentType = "packages" | "services" | "portfolio";

/**
 * One editable catalog record. The three content types share one loose model (as the Vite form did), so the
 * forms can edit what the API returns without dropping fields they don't show.
 */
export type ContentItem = {
  id?: string;
  slug?: string;
  sortOrder?: number;
  isActive?: boolean;
  // packages
  type?: string;
  name?: string;
  load?: string;
  kva?: string | number;
  volt?: string | number | null;
  legacyId?: string | number | null;
  /** Admin responses (composed or legacy options); edited through `PackageOptionsEditor`. */
  options?: PackageOptionRecord[];
  /** Deprecated top-level package items (Commerce v2 §1.1). Read only; never sent back. */
  items?: unknown;
  // services
  title?: string;
  subtitle?: string;
  image?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  // portfolio
  link?: string;
  featured?: boolean;
  mobile?: boolean;
};

export type FieldErrors = Partial<Record<keyof ContentItem, string>>;

export const packageTypeOptions = [
  { value: "tubular", label: "Tubular" },
  { value: "lithium", label: "Lithium" },
  { value: "hybrid lithium", label: "Hybrid lithium" },
];

export const emptyPackage: ContentItem = {
  type: "tubular",
  name: "",
  load: "",
  kva: "",
  volt: "",
  options: [],
  isActive: true,
};

export const emptyService: ContentItem = {
  title: "",
  subtitle: "",
  image: "",
  // Default label shown on the public site; kept exactly as the Vite admin stored it.
  ctaLabel: "Let's go",
  ctaUrl: "/packages",
  isActive: true,
};

export const emptyPortfolio: ContentItem = {
  name: "",
  image: "",
  link: "",
  featured: false,
  mobile: true,
  isActive: true,
};

export const getTitle = (item: ContentItem) => item.name || item.title || "Untitled";
export const capitalize = (value = "") => (value ? value.charAt(0).toUpperCase() + value.slice(1) : "");
const formatNumber = (value: number) => new Intl.NumberFormat("en-NG").format(value);

// Numeric fields accept a JSON number or a plain decimal string, as the API does (no signs, exponents or padding).
const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;
const toNumber = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (typeof value === "string" && DECIMAL_PATTERN.test(value)) return Number(value);
  return NaN;
};
const isBlank = (value: unknown) => value === undefined || value === null || String(value).trim() === "";

const textError = (value: unknown, max: number, label: string, { required = false } = {}) => {
  const text = String(value ?? "").trim();
  if (!text) return required ? `${label} is required.` : "";
  return text.length > max ? `${label} must be ${max} characters or fewer.` : "";
};

const positiveNumberError = (value: unknown, label: string, max: number, { required = false } = {}) => {
  if (isBlank(value)) return required ? `${label} is required.` : "";
  const text = typeof value === "string" ? value.trim() : value;
  if (Number.isNaN(toNumber(text))) return `${label} must be a number.`;
  if (String(text).length > max) return `${label} must be ${max} characters or fewer.`;
  return toNumber(text) > 0 ? "" : `${label} must be greater than 0.`;
};

const LEGACY_ID_MAX = 1_000_000_000;
const legacyIdError = (value: unknown) => {
  if (isBlank(value)) return "";
  const text = typeof value === "string" ? value.trim() : value;
  const number = typeof text === "number" ? text : typeof text === "string" && /^\d+$/.test(text) ? Number(text) : NaN;
  return Number.isInteger(number) && number >= 0 && number <= LEGACY_ID_MAX
    ? ""
    : `Shop id must be a whole number from 0 to ${formatNumber(LEGACY_ID_MAX)}.`;
};

/**
 * Package payload in the shape the API validates: blank volt clears it, a blank shop id is left unchanged. Options go
 * in the stored shape and the deprecated top-level `items` is dropped (Commerce v2 §1.1).
 */
export const toPackagePayload = (model: ContentItem, options: PackageOptionInput[]) => {
  const trimmed = <V>(value: V) => (typeof value === "string" ? value.trim() : value);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { options: _responseOptions, items: _deprecatedItems, ...rest } = model;
  const payload = { ...rest, options, kva: trimmed(model.kva) };
  payload.volt = isBlank(model.volt) ? null : trimmed(model.volt);
  if (isBlank(model.legacyId)) delete payload.legacyId;
  else payload.legacyId = Number(trimmed(model.legacyId));
  return payload;
};

// Mirrors the API's required fields, limits and URL rule so problems show next to the field before saving.
export const validateModel = (type: ContentType, model: ContentItem): FieldErrors => {
  const errors: FieldErrors =
    type === "packages"
      ? {
          name: textError(model.name, LIMITS.packageName, "Name", { required: true }),
          type: textError(model.type, LIMITS.packageType, "Battery type", { required: true }),
          kva: positiveNumberError(model.kva, "Inverter size", LIMITS.packageKva, { required: true }),
          volt: positiveNumberError(model.volt, "Voltage", LIMITS.packageVolt),
          legacyId: legacyIdError(model.legacyId),
          load: textError(model.load, LIMITS.packageLoad, "What it can power", { required: true }),
        }
      : type === "services"
        ? {
            title: textError(model.title, LIMITS.serviceTitle, "Title", { required: true }),
            subtitle: textError(model.subtitle, LIMITS.serviceSubtitle, "Description", { required: true }),
            ctaLabel: textError(model.ctaLabel, LIMITS.serviceCtaLabel, "Button label"),
            image: validateUrlField(model.image, "Image", { required: true }),
            ctaUrl: validateUrlField(model.ctaUrl, "Button link"),
          }
        : {
            name: textError(model.name, LIMITS.portfolioName, "Name", { required: true }),
            image: validateUrlField(model.image, "Image", { required: true }),
            link: validateUrlField(model.link, "Link"),
          };
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message)) as FieldErrors;
};
