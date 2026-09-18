// Pure package helpers for the storefront catalogue (server and client safe).
import type { ComposedItem, Package, PackageOption } from "@/lib/api/types";

/**
 * Commerce v3 §4: packages are grouped by their catalogue category. The filter value is the category slug, "all" for
 * every package, or "other" for the packages with no category (the admin may leave one unset).
 */
export type PackageCategoryFilter = string;
export type KvaFilter = "all" | "up-to-2" | "2-5" | "5-10" | "10-plus";
export type PackageSort = "recommended" | "price-asc" | "price-desc";

/** Filter value for the packages with no catalogue category (a category slugged "other" would share the group). */
export const OTHER_CATEGORY = "other";

/** Label for the "no category" group, used wherever a package has no `categoryRef`. */
export const OTHER_CATEGORY_LABEL = "Other";

export const KVA_FILTERS: { value: KvaFilter; label: string; min: number; max: number }[] = [
  { value: "all", label: "Any size", min: 0, max: Infinity },
  { value: "up-to-2", label: "Up to 2kVA", min: 0, max: 2 },
  { value: "2-5", label: "2 to 5kVA", min: 2, max: 5 },
  { value: "5-10", label: "5 to 10kVA", min: 5, max: 10 },
  { value: "10-plus", label: "Over 10kVA", min: 10, max: Infinity },
];

export const PACKAGE_SORTS: { value: PackageSort; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

/** Fields every category helper reads: the catalogue category, with the stored battery type as the label fallback. */
type PackageCategoryFields = Pick<Package, "type"> & Partial<Pick<Package, "categoryRef">>;

/** "hybrid lithium" → "Hybrid lithium", so older packages with no category still read well. "" when unset. */
const storedTypeLabel = (type: Package["type"] | null | undefined) => {
  const text = String(type ?? "")
    .trim()
    .replace(/[-_]+/g, " ");
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
};

/** URL-friendly key for a package's catalogue category: its slug, or "other" when it has none. */
export const packageCategoryKey = (pkg: Pick<Package, "categoryRef">): PackageCategoryFilter => pkg.categoryRef?.slug || OTHER_CATEGORY;

/** The category name, falling back to the stored battery type ("Lithium") and then "Package". */
export const packageCategoryLabel = (pkg: PackageCategoryFields) =>
  pkg.categoryRef?.name?.trim() || storedTypeLabel(pkg.type) || "Package";

export type PackageCategoryOption = { value: PackageCategoryFilter; label: string; count: number };

/**
 * Filter options for the packages on a page, built from the categories those packages actually carry (categories are
 * managed in the admin, so there is no fixed list): each category once, by name, with "Other" last when some package
 * has no category. Counts are the packages in each option. No "all" option — callers that need one prepend it.
 */
export const packageCategoryOptions = (packages: PackageCategoryFields[]): PackageCategoryOption[] => {
  const options = new Map<string, PackageCategoryOption>();
  for (const pkg of packages) {
    const value = packageCategoryKey(pkg);
    const option = options.get(value);
    if (option) option.count += 1;
    else options.set(value, { value, label: value === OTHER_CATEGORY ? OTHER_CATEGORY_LABEL : packageCategoryLabel(pkg), count: 1 });
  }
  const other = options.get(OTHER_CATEGORY);
  const named = [...options.values()].filter((option) => option.value !== OTHER_CATEGORY).sort((a, b) => a.label.localeCompare(b.label));
  return other ? [...named, other] : named;
};

/**
 * The selected category from the query string: `?category=<slug>`, or the legacy `?type=` value so older links still
 * work. Anything that is not an option on this page (a removed or renamed category, an old battery type) reads "all".
 */
export const parseCategoryFilter = (value: string | null | undefined, options: PackageCategoryOption[]): PackageCategoryFilter =>
  options.some((option) => option.value === value) ? (value as PackageCategoryFilter) : "all";

export const parseKvaFilter = (value: string | null | undefined): KvaFilter =>
  KVA_FILTERS.some((item) => item.value === value) ? (value as KvaFilter) : "all";

export const parseSort = (value: string | null | undefined): PackageSort =>
  PACKAGE_SORTS.some((item) => item.value === value) ? (value as PackageSort) : "recommended";

const toNumber = (value: number | string | null | undefined) => {
  const number = typeof value === "string" ? Number(value.replace(/[^\d.]/g, "")) : Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const kvaValue = (pkg: Pick<Package, "kva">) => toNumber(pkg.kva);

/**
 * Commerce v2 §1.2: an option can be bought when the API hasn't marked it `available: false` and it has a price.
 * Older responses and build fallbacks have no `available` field, so a missing flag counts as available.
 */
export const isOptionAvailable = (option: Pick<PackageOption, "price"> & { available?: boolean }) =>
  option.available !== false && toNumber(option.price) > 0;

/** Available options with their price, keeping their ORIGINAL index into `pkg.options` (the cart uses the index). */
export const pricedOptions = (pkg: Pick<Package, "options">) =>
  (pkg.options ?? [])
    .map((option, index) => ({ ...option, index, amount: toNumber(option.price) }))
    .filter((option) => isOptionAvailable(option));

export type PricedOption = ReturnType<typeof pricedOptions>[number];

/** True when at least one option can be bought. Unavailable packages are left out of listings and the home finder. */
export const isPackageAvailable = (pkg: Pick<Package, "options">) => pricedOptions(pkg).length > 0;

export const availablePackages = <T extends Pick<Package, "options">>(packages: T[]) => packages.filter(isPackageAvailable);

/** Lowest available option price, or 0 when no option is available. */
export const lowestPrice = (pkg: Pick<Package, "options">) => {
  const prices = pricedOptions(pkg).map((option) => option.amount);
  return prices.length ? Math.min(...prices) : 0;
};

/** Highest available option price, or 0 when no option is available. */
export const highestPrice = (pkg: Pick<Package, "options">) => {
  const prices = pricedOptions(pkg).map((option) => option.amount);
  return prices.length ? Math.max(...prices) : 0;
};

/** Option index 1 is "with solar" in the cart contract. */
export const hasSolarOption = (pkg: Pick<Package, "options">) => pricedOptions(pkg).some((option) => option.index === 1);

/** The cart contract knows two options: index 0 without solar, index 1 with solar. */
export const CART_OPTION_COUNT = 2;

/** Available options the cart can take (original index 0 or 1), in API order. */
export const cartOptions = (pkg: Pick<Package, "options">) => pricedOptions(pkg).filter((option) => option.index < CART_OPTION_COUNT);

/** Default choice for the picker and cards: the cheapest option the cart can take (its original index, 0 when none). */
export const defaultCartOptionIndex = (pkg: Pick<Package, "options">) => {
  const options = cartOptions(pkg);
  if (!options.length) return 0;
  return options.reduce((best, option) => (option.amount < best.amount ? option : best)).index;
};

/** The option's products (`[]` for legacy options and older responses without `items`). */
export const optionItems = (option: { items?: ComposedItem[] | null }): ComposedItem[] => option.items ?? [];

/** Composed options list products; legacy options only have the kits text. */
export const isComposedOption = (option: { composed?: boolean; items?: ComposedItem[] | null }) => optionItems(option).length > 0;

/**
 * Number of distinct products in the cheapest available composed option, for the card hint "Includes N products".
 * 0 when that option is legacy (no products listed).
 */
export const includedProductCount = (pkg: Pick<Package, "options">) => {
  const options = pricedOptions(pkg);
  if (!options.length) return 0;
  const cheapest = options.reduce((best, option) => (option.amount < best.amount ? option : best));
  return optionItems(cheapest).length;
};

/**
 * The first `limit` products of the cheapest available option, with how many more it lists, for card previews
 * ("2 × 200Ah lithium battery … and 3 more"). Empty for legacy options.
 */
export const includedProducts = (pkg: Pick<Package, "options">, limit = 3) => {
  const options = pricedOptions(pkg);
  if (!options.length) return { items: [] as ComposedItem[], more: 0 };
  const cheapest = options.reduce((best, option) => (option.amount < best.amount ? option : best));
  const items = optionItems(cheapest);
  return { items: items.slice(0, limit), more: Math.max(0, items.length - limit) };
};

/**
 * True when an available option lists the product. Also reads the deprecated top-level `items` (contract §4.3) in
 * case an older API still returns it.
 */
export const packageIncludesProduct = (pkg: Pick<Package, "options" | "items">, productId: string) =>
  pricedOptions(pkg).some((option) => optionItems(option).some((line) => line.productId === productId)) ||
  (isPackageAvailable(pkg) && (pkg.items ?? []).some((line) => line.productId === productId));

/** "1.1kVA" or "1.1kVA · 24V". */
export const packageRating = (pkg: Pick<Package, "kva" | "volt">) =>
  [`${pkg.kva}kVA`, pkg.volt ? `${pkg.volt}V` : ""].filter(Boolean).join(" · ");

export type PackageFilterState = { category: PackageCategoryFilter; kva: KvaFilter; sort: PackageSort };

export function filterPackages(packages: Package[], { category, kva, sort }: PackageFilterState): Package[] {
  const range = KVA_FILTERS.find((item) => item.value === kva) ?? KVA_FILTERS[0];
  const filtered = packages.filter((pkg) => {
    if (category !== "all" && packageCategoryKey(pkg) !== category) return false;
    if (kva === "all") return true;
    const size = kvaValue(pkg);
    return size > range.min && size <= range.max;
  });
  if (sort === "recommended") return filtered;
  const direction = sort === "price-asc" ? 1 : -1;
  // Unpriced packages go last either way.
  return [...filtered].sort((a, b) => {
    const priceA = lowestPrice(a);
    const priceB = lowestPrice(b);
    if (!priceA || !priceB) return priceA ? -1 : priceB ? 1 : 0;
    return (priceA - priceB) * direction;
  });
}

/** Stable React key: seeded package ids can repeat across API and fallback data, so include the visible fields. */
export const packageKey = (pkg: Package) => `${pkg.id}|${pkg.type}|${pkg.name}|${pkg.kva}|${pkg.volt ?? ""}`;
