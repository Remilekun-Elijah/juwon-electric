/**
 * Package option editing (Commerce v2 §1): drafts for the package drawer, the client-side price preview, validation
 * that mirrors the server, and conversion to the stored option shape. The server computes the real price on read.
 */
import type { PackageOptionInput, Product, ProductStatus } from "@/lib/api/types";
import { LIMITS } from "@/lib/validation";

export const OPTION_LIMITS = {
  name: 60,
  items: 50,
  quantityMin: 1,
  quantityMax: 1000,
  note: 200,
  adjustmentMax: 1_000_000_000,
  kits: LIMITS.optionKits,
  options: LIMITS.packageOptions,
} as const;

/** An option as the admin API returns it (composed or legacy). Everything is optional so old records still load. */
export type PackageOptionRecord = {
  name?: string;
  price?: number | string;
  kits?: string;
  composed?: boolean;
  available?: boolean;
  inStock?: boolean;
  productsTotal?: number | null;
  priceAdjustment?: number;
  items?: {
    productId: string;
    quantity: number;
    note?: string | null;
    name?: string;
    sku?: string;
    unitPrice?: number;
  }[];
};

/** What the editor knows about a product in an option. Stock and status are null until the product is loaded. */
export type PickedProduct = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stockQuantity: number | null;
  status: ProductStatus | null;
};

export type ItemDraft = { rowId: string; productId: string; quantity: number; note: string; product: PickedProduct };

export type OptionDraft = {
  rowId: string;
  name: string;
  items: ItemDraft[];
  adjustmentSign: 1 | -1;
  /** Whole naira, without the sign. */
  adjustmentAmount: string;
  /** Legacy manual price (only used when there are no items). */
  price: string;
  /** Legacy contents text (only used when there are no items). */
  kits: string;
};

export type OptionErrors = Partial<Record<"name" | "price" | "kits" | "adjustment" | "items", string>>;

let rowSequence = 0;
const nextRowId = () => `option-row-${++rowSequence}`;

export const pickedFromProduct = (product: Product): PickedProduct => ({
  id: product.id,
  name: product.name,
  sku: product.sku,
  price: product.price,
  stockQuantity: product.stockQuantity,
  status: product.status,
});

export const emptyOptionDraft = (name = ""): OptionDraft => ({
  rowId: nextRowId(),
  name,
  items: [],
  adjustmentSign: 1,
  adjustmentAmount: "",
  price: "",
  kits: "",
});

export const itemDraftFor = (product: Product): ItemDraft => ({
  rowId: nextRowId(),
  productId: product.id,
  quantity: 1,
  note: "",
  product: pickedFromProduct(product),
});

const priceText = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  return typeof value === "string" ? value.replace(/[^\d.]/g, "") : "";
};

export const toOptionDrafts = (options: unknown): OptionDraft[] => {
  const list = Array.isArray(options) ? (options as PackageOptionRecord[]) : [];
  if (!list.length) return [emptyOptionDraft("Without solar"), emptyOptionDraft("With solar")];
  return list.map((option) => {
    const adjustment = Number(option?.priceAdjustment) || 0;
    const items = Array.isArray(option?.items) ? option.items : [];
    return {
      rowId: nextRowId(),
      name: String(option?.name ?? ""),
      items: items.map((item) => ({
        rowId: nextRowId(),
        productId: item.productId,
        quantity: Number(item.quantity) || 1,
        note: item.note ?? "",
        product: {
          id: item.productId,
          name: item.name || "Product",
          sku: item.sku || "",
          price: Number(item.unitPrice) || 0,
          stockQuantity: null,
          status: null,
        },
      })),
      adjustmentSign: adjustment < 0 ? -1 : 1,
      adjustmentAmount: adjustment ? String(Math.abs(adjustment)) : "",
      price: priceText(option?.price),
      kits: typeof option?.kits === "string" ? option.kits : "",
    };
  });
};

/** Every product id referenced by the drafts (to load current price, stock and status). */
export const draftProductIds = (drafts: OptionDraft[]) => [
  ...new Set(drafts.flatMap((draft) => draft.items.map((item) => item.productId))),
];

/** Replaces item product snapshots with freshly loaded products. */
export const hydrateDrafts = (drafts: OptionDraft[], products: Map<string, Product>) =>
  drafts.map((draft) => ({
    ...draft,
    items: draft.items.map((item) => {
      const product = products.get(item.productId);
      return product ? { ...item, product: pickedFromProduct(product) } : item;
    }),
  }));

const parseAdjustment = (draft: OptionDraft) => {
  const text = draft.adjustmentAmount.trim();
  if (!text) return 0;
  return /^\d+$/.test(text) ? draft.adjustmentSign * Number(text) : NaN;
};

export type OptionPricing = {
  composed: boolean;
  productsTotal: number;
  adjustment: number;
  publicPrice: number;
  /** SKUs whose stock is below the item quantity. */
  short: string[];
  archived: string[];
  /** True while any product's stock hasn't been loaded. */
  stockUnknown: boolean;
};

/** Client-side preview of Commerce v2 §1.2 pricing from the loaded product prices. */
export const priceOption = (draft: OptionDraft): OptionPricing => {
  const composed = draft.items.length > 0;
  const adjustment = parseAdjustment(draft);
  const productsTotal = draft.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const legacyPrice = Number(priceText(draft.price)) || 0;
  return {
    composed,
    productsTotal,
    adjustment: Number.isNaN(adjustment) ? 0 : adjustment,
    publicPrice: composed ? productsTotal + (Number.isNaN(adjustment) ? 0 : adjustment) : legacyPrice,
    short: draft.items
      .filter((item) => item.product.stockQuantity !== null && item.product.stockQuantity < item.quantity)
      .map((item) => item.product.sku || item.product.name),
    archived: draft.items
      .filter((item) => item.product.status === "archived")
      .map((item) => item.product.sku || item.product.name),
    stockUnknown: draft.items.some((item) => item.product.stockQuantity === null),
  };
};

const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

/** Mirrors the server rules so problems show next to the option before saving. */
export const validateOptionDrafts = (drafts: OptionDraft[]) => {
  const errors: Record<string, OptionErrors> = {};
  let general = "";
  if (!drafts.length) general = "Add at least one price option.";
  else if (drafts.length > OPTION_LIMITS.options) general = `A package can have up to ${OPTION_LIMITS.options} options.`;

  const seen = new Set<string>();
  for (const draft of drafts) {
    const optionErrors: OptionErrors = {};
    const name = draft.name.trim();
    if (!name) optionErrors.name = "Option name is required.";
    else if (name.length > OPTION_LIMITS.name) optionErrors.name = `Option name must be ${OPTION_LIMITS.name} characters or fewer.`;
    else if (seen.has(name.toLowerCase())) optionErrors.name = "Each option needs a different name.";
    seen.add(name.toLowerCase());

    if (draft.items.length) {
      const pricing = priceOption(draft);
      if (draft.items.length > OPTION_LIMITS.items) optionErrors.items = `An option can have up to ${OPTION_LIMITS.items} products.`;
      else if (pricing.archived.length) optionErrors.items = `Archived products can’t be added to a package: ${pricing.archived.join(", ")}.`;
      else if (draft.items.some((item) => item.note.trim().length > OPTION_LIMITS.note)) {
        optionErrors.items = `Notes must be ${OPTION_LIMITS.note} characters or fewer.`;
      }
      const text = draft.adjustmentAmount.trim();
      if (text && (!/^\d+$/.test(text) || Number(text) > OPTION_LIMITS.adjustmentMax)) {
        optionErrors.adjustment = "Enter a whole number of naira, up to 1,000,000,000.";
      } else if (pricing.publicPrice <= 0) {
        optionErrors.adjustment = "The public price must be greater than 0.";
      }
    } else {
      const price = draft.price.trim();
      if (!DECIMAL_PATTERN.test(price) || !(Number(price) > 0) || Number(price) > LIMITS.optionPriceMax) {
        optionErrors.price = "Enter a price greater than 0 and at most 1,000,000,000.";
      }
      const kits = draft.kits.trim();
      if (!kits) optionErrors.kits = "Describe what’s included.";
      else if (kits.length > OPTION_LIMITS.kits) optionErrors.kits = `Keep this to ${OPTION_LIMITS.kits} characters or fewer.`;
    }
    if (Object.keys(optionErrors).length) errors[draft.rowId] = optionErrors;
  }
  return { errors, general };
};

/** Stored option shape (Commerce v2 §1.1). Composed options send items and the adjustment; legacy ones the manual price. */
export const toOptionInputs = (drafts: OptionDraft[]): PackageOptionInput[] =>
  drafts.map((draft) =>
    draft.items.length
      ? {
          name: draft.name.trim(),
          items: draft.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            note: item.note.trim() || null,
          })),
          priceAdjustment: parseAdjustment(draft) || 0,
        }
      : { name: draft.name.trim(), price: Number(draft.price.trim()), kits: draft.kits.trim() }
  );

/**
 * Places a server validation message next to the option it names ("Option <name> price must be greater than 0.").
 * Product messages go to the options section as a whole.
 */
export const placeServerOptionError = (message: string, drafts: OptionDraft[]) => {
  const match = /^Option (.+?) (price|name|must|can|has|is)\b/i.exec(message);
  const draft = match ? drafts.find((item) => item.name.trim().toLowerCase() === match[1].trim().toLowerCase()) : undefined;
  if (draft) return { rowId: draft.rowId, errors: { [/price/i.test(message) ? "adjustment" : "name"]: message } as OptionErrors };
  if (/product|option|package/i.test(message)) return { general: message };
  return null;
};

type PackageLike = { options?: unknown };

/** Number of package options that include each product (Products screen warnings). */
export const countProductUsage = (packages: readonly PackageLike[]) => {
  const usage = new Map<string, number>();
  for (const pkg of packages) {
    const options = Array.isArray(pkg.options) ? (pkg.options as PackageOptionRecord[]) : [];
    for (const option of options) {
      const ids = new Set((option?.items ?? []).map((item) => item.productId));
      ids.forEach((productId) => usage.set(productId, (usage.get(productId) ?? 0) + 1));
    }
  }
  return usage;
};
