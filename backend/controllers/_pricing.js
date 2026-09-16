// Server-side package resolution and pricing for carts and orders.
// Client-sent prices/totals are never trusted; everything is recomputed from
// the active package catalog.
import { badRequest } from "../services/errors.js";

export const UNAVAILABLE_ITEMS_MESSAGE =
  "Some items in your cart are no longer available. Please refresh your cart.";

// Same parsing the admin dashboard uses for stored money values.
export const parseMoney = (value) => {
  if (typeof value === "number") return value;
  if (!value) return 0;
  return Number(String(value).replace(/[^\d.-]/g, "")) || 0;
};

// Matches the checkout form: "₦" + Intl.NumberFormat().format(amount).
export const formatMoney = (amount) =>
  `₦${new Intl.NumberFormat("en-US").format(amount)}`;

const matchText = (value) => String(value ?? "").trim().toLowerCase();
export const hasValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

// Checkout historically sends display strings ("Inverter + tubular",
// "5kva + 48volt"); normalize them to the raw package fields before matching.
const normalizeItemType = (value) => {
  const type = matchText(value);
  if (type === "hybrid inverter + lithium") return "hybrid lithium";
  return type.replace(/^inverter\s*\+\s*/, "");
};

// Anchored, bounded patterns; item fields are length-checked (<= 50 chars)
// before this runs (validatePricingItems).
const KVA_PATTERN = /^\s*(\d{1,6}(?:\.\d{1,3})?)\s*kva\b/i;
const VOLT_PATTERN = /(?:^|[^\d.])(\d{1,6}(?:\.\d{1,3})?)\s*volts?\b/i;

const parseItemKva = (item) => {
  const raw = item?.kva;
  const text = String(raw ?? "");
  const kvaMatch = text.match(KVA_PATTERN);
  const voltMatch = text.match(VOLT_PATTERN);
  return {
    kva: kvaMatch ? kvaMatch[1] : raw,
    volt:
      item && Object.prototype.hasOwnProperty.call(item, "volt")
        ? { given: true, value: item.volt }
        : voltMatch
          ? { given: true, value: voltMatch[1] }
          : { given: false },
  };
};

const sameNumberish = (a, b) => {
  if (!hasValue(a) && !hasValue(b)) return true;
  if (!hasValue(a) || !hasValue(b)) return false;
  const left = Number(a);
  const right = Number(b);
  if (!Number.isNaN(left) && !Number.isNaN(right)) return left === right;
  return matchText(a) === matchText(b);
};

// Resolution rule (kept identical to the Cloudflare Worker):
// 1. Active packages whose public id (legacyId) equals item.id; if the item
//    carries type/name/kva, those must also match (case-insensitive, trimmed).
// 2. Otherwise fall back to type + name + kva (+ volt when the item includes it).
// `packages` must already be restricted to active packages.
export const resolvePackage = (packages, item) => {
  const type = hasValue(item.type) ? normalizeItemType(item.type) : undefined;
  const name = hasValue(item.name) ? matchText(item.name) : undefined;
  const { kva, volt } = parseItemKva(item);
  const kvaGiven = hasValue(kva);

  const matchesDescriptors = (pack) =>
    (type === undefined || matchText(pack.type) === type) &&
    (name === undefined || matchText(pack.name) === name) &&
    (!kvaGiven || sameNumberish(pack.kva, kva));

  if (hasValue(item.id)) {
    const byId = packages.find(
      (pack) =>
        hasValue(pack.legacyId) &&
        String(pack.legacyId).trim() === String(item.id).trim() &&
        matchesDescriptors(pack)
    );
    if (byId) return byId;
  }

  if (type === undefined || name === undefined || !kvaGiven) return null;
  return (
    packages.find(
      (pack) =>
        matchesDescriptors(pack) && (!volt.given || sameNumberish(pack.volt, volt.value))
    ) || null
  );
};

// Option choice, in order: explicit optionName/option; the cart's `withSolar`
// flag ("true"/"false"); the kits text at the end of the checkout's `package`
// label. An explicit name that is not found falls back to withSolar, then the
// kits text, and fails only when neither is given or matches. With nothing
// given at all, the first ("Without solar") option is used.
export const selectPackageOption = (pack, item) => {
  const options = Array.isArray(pack.options) ? pack.options : [];
  const explicit = item.optionName ?? item.option;
  if (hasValue(explicit)) {
    const byName = options.find((option) => matchText(option.name) === matchText(explicit));
    if (byName) return byName;
  }
  if (hasValue(item.withSolar)) {
    const withSolar = String(item.withSolar).trim().toLowerCase() === "true";
    const bySolar =
      options.find(
        (option) => matchText(option.name) === (withSolar ? "with solar" : "without solar")
      ) || options[withSolar ? 1 : 0];
    if (bySolar) return bySolar;
  }
  if (hasValue(item.package)) {
    const description = matchText(item.package);
    const byKits = options.find(
      (option) => hasValue(option.kits) && description.endsWith(matchText(option.kits))
    );
    if (byKits) return byKits;
  }
  if (hasValue(explicit) || hasValue(item.withSolar) || hasValue(item.package)) return null;
  return options[0] || null;
};

/**
 * Resolves and prices one shape-checked item; null when the package or option
 * can't be priced (inactive, removed or unmatched). Carts may also reference a
 * package by its internal `packageId`.
 */
export const priceItem = (packages, { item, quantity }, { kind = "order" } = {}) => {
  const pack =
    (kind === "cart" &&
      hasValue(item.packageId) &&
      packages.find((entry) => entry.id === String(item.packageId))) ||
    resolvePackage(packages, item);
  const option = pack && selectPackageOption(pack, item);
  const unitPrice = option ? parseMoney(option.price) : 0;
  if (!pack || !option || unitPrice <= 0) return null;
  return { pack, option, unitPrice, quantity, lineTotal: unitPrice * quantity };
};

/**
 * Prices every item (validatePricingItems output) against the active catalog.
 * Throws 400 UNAVAILABLE_ITEMS_MESSAGE if any item cannot be priced.
 */
export const priceItems = (packages, validated, options = {}) =>
  validated.map((entry) => {
    const priced = priceItem(packages, entry, options);
    if (!priced) throw badRequest(UNAVAILABLE_ITEMS_MESSAGE);
    return priced;
  });
