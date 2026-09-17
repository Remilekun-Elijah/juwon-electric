// Pure package helpers for the storefront catalogue (server and client safe).
import type { ComposedItem, Package, PackageOption } from "@/lib/api/types";
import { packageTabIndex } from "@/lib/packages";

export type PackageTypeFilter = "all" | "tubular" | "lithium" | "hybrid-lithium";
export type KvaFilter = "all" | "up-to-2" | "2-5" | "5-10" | "10-plus";
export type PackageSort = "recommended" | "price-asc" | "price-desc";

export const PACKAGE_TYPE_FILTERS: { value: PackageTypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "tubular", label: "Tubular" },
  { value: "lithium", label: "Lithium" },
  { value: "hybrid-lithium", label: "Hybrid lithium" },
];

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

const TYPE_BY_TAB: PackageTypeFilter[] = ["tubular", "lithium", "hybrid-lithium"];

/** URL-friendly type key for a package (unknown types group with hybrid, as lib/packages does). */
export const packageTypeKey = (pkg: Pick<Package, "type">): Exclude<PackageTypeFilter, "all"> =>
  TYPE_BY_TAB[packageTabIndex(pkg)] as Exclude<PackageTypeFilter, "all">;

/** "Tubular", "Lithium" or "Hybrid lithium". */
export const packageTypeLabel = (pkg: Pick<Package, "type">) =>
  PACKAGE_TYPE_FILTERS.find((item) => item.value === packageTypeKey(pkg))?.label ?? "Package";

export const parseTypeFilter = (value: string | null | undefined): PackageTypeFilter =>
  PACKAGE_TYPE_FILTERS.some((item) => item.value === value) ? (value as PackageTypeFilter) : "all";

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
 * True when an available option lists the product. Also reads the deprecated top-level `items` (contract §4.3) in
 * case an older API still returns it.
 */
export const packageIncludesProduct = (pkg: Pick<Package, "options" | "items">, productId: string) =>
  pricedOptions(pkg).some((option) => optionItems(option).some((line) => line.productId === productId)) ||
  (isPackageAvailable(pkg) && (pkg.items ?? []).some((line) => line.productId === productId));

/** "1.1kVA" or "1.1kVA · 24V". */
export const packageRating = (pkg: Pick<Package, "kva" | "volt">) =>
  [`${pkg.kva}kVA`, pkg.volt ? `${pkg.volt}V` : ""].filter(Boolean).join(" · ");

export type PackageFilterState = { type: PackageTypeFilter; kva: KvaFilter; sort: PackageSort };

export function filterPackages(packages: Package[], { type, kva, sort }: PackageFilterState): Package[] {
  const range = KVA_FILTERS.find((item) => item.value === kva) ?? KVA_FILTERS[0];
  const filtered = packages.filter((pkg) => {
    if (type !== "all" && packageTypeKey(pkg) !== type) return false;
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
