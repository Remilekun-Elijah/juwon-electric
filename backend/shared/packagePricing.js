// Composed package options (COMMERCE_V2 §1): option normalisation (including the read-time
// migration of the deprecated top-level `items`), computed pricing, availability and stock,
// generated kits text, order line snapshots, public/admin serialisation and write validation.
// Pure: both runtimes load packages and products and call these functions.
import { badRequest } from "./errors.js";
import { OPS_LIMITS, integer, isPlainObject, number, text } from "./fields.js";

export const PACKAGE_LIMITS = Object.freeze({
  options: 10,
  optionName: 60,
  optionKits: 300,
  optionItems: 50,
  itemQuantityMax: 1000,
  itemNote: 200,
  priceMax: 1_000_000_000,
  adjustmentMax: 1_000_000_000,
});

export const UNAVAILABLE_ITEMS_MESSAGE = "Some items in your cart are no longer available. Please refresh your cart.";
export const TOP_LEVEL_ITEMS_MESSAGE = "Add products to each option instead of the package.";

/** Stored money values: numbers, or display strings such as "₦1,150,000". */
export const parseMoney = (value) => {
  if (typeof value === "number") return value;
  if (!value) return 0;
  return Number(String(value).replace(/[^\d.-]/g, "")) || 0;
};

/** "₦" + en-US grouping, the format the checkout form and stored orders use. */
export const formatNaira = (amount) => `₦${new Intl.NumberFormat("en-US").format(amount)}`;

const hasItems = (value) => Array.isArray(value) && value.length > 0;

const isArchived = (product) => (product?.status || "active") === "archived";

// ---- normalisation ------------------------------------------------------------------------

/**
 * Stored options with the read-time migration applied: an option without items takes the
 * package's deprecated top-level `items` when the package still has them.
 */
export const normalizeOptions = (pack) => {
  const options = Array.isArray(pack?.options) ? pack.options : [];
  const legacyItems = hasItems(pack?.items) ? pack.items : null;
  return options.map((option) => {
    const stored = isPlainObject(option) ? option : {};
    if (hasItems(stored.items) || !legacyItems) return stored;
    return { ...stored, items: legacyItems };
  });
};

export const isComposedOption = (option) => hasItems(option?.items);

/** True when any package has a composed option (so products must be loaded to price it). */
export const packagesNeedProducts = (packages) =>
  packages.some((pack) => normalizeOptions(pack).some(isComposedOption));

/** Product ids referenced by any option item (or deprecated top-level item) of the package. */
export const packageProductIds = (pack) => {
  const ids = new Set();
  for (const option of normalizeOptions(pack)) {
    for (const item of Array.isArray(option.items) ? option.items : []) if (item?.productId) ids.add(item.productId);
  }
  for (const item of Array.isArray(pack?.items) ? pack.items : []) if (item?.productId) ids.add(item.productId);
  return ids;
};

// ---- computed pricing -------------------------------------------------------------------------

const attributesOf = (product) => (isPlainObject(product?.attributes) ? product.attributes : {});

/** "1 × 5kVA Inverter, 4 × 200Ah Battery" */
export const kitsText = (items) => items.map((item) => `${item.quantity} × ${item.name}`).join(", ");

/**
 * The admin ComposedOption for one stored option (§1.2). Prices use the current product
 * prices; a missing or archived product, or a price <= 0, makes the option unavailable.
 */
export const composeOption = (option, productsById) => {
  const name = String(option?.name ?? "");
  if (!isComposedOption(option)) {
    const price = parseMoney(option?.price);
    return {
      name,
      composed: false,
      productsTotal: null,
      priceAdjustment: 0,
      price,
      available: price > 0,
      inStock: true,
      kits: typeof option?.kits === "string" ? option.kits : "",
      items: [],
    };
  }

  let available = true;
  let inStock = true;
  let productsTotal = 0;
  const items = option.items.map((item) => {
    const product = productsById.get(item.productId);
    const quantity = Number(item.quantity) || 0;
    if (!product || isArchived(product)) available = false;
    if (!product || (Number(product.stockQuantity) || 0) < quantity) inStock = false;
    const unitPrice = product ? Number(product.price) || 0 : 0;
    const lineTotal = unitPrice * quantity;
    productsTotal += lineTotal;
    return {
      productId: item.productId,
      quantity,
      note: item.note ?? null,
      name: product?.name ?? "",
      slug: product?.slug ?? "",
      sku: product?.sku ?? "",
      brand: product?.brand || null,
      categoryId: product?.categoryId ?? null,
      attributes: attributesOf(product),
      unitPrice,
      lineTotal,
    };
  });
  const priceAdjustment = Number(option.priceAdjustment) || 0;
  const price = productsTotal + priceAdjustment;
  return {
    name,
    composed: true,
    productsTotal,
    priceAdjustment,
    price,
    available: available && price > 0,
    inStock,
    kits: kitsText(items),
    items,
  };
};

export const composeOptions = (pack, productsById) =>
  normalizeOptions(pack).map((option) => composeOption(option, productsById));

/** Package with computed options, for resolving and pricing cart and order lines. */
export const withComposedOptions = (pack, productsById) => ({ ...pack, options: composeOptions(pack, productsById) });

/** Public option: the markup fields (productsTotal, priceAdjustment, unitPrice, lineTotal) are internal. */
export const publicOption = ({ productsTotal: _total, priceAdjustment: _adjustment, items, ...rest }) => ({
  ...rest,
  items: items.map(({ unitPrice: _unitPrice, lineTotal: _lineTotal, ...item }) => item),
});

/** GET /packages and /packages/:id. Top-level `items` is no longer returned. */
export const serializePublicPackage = (pack, productsById) => ({
  id: pack.legacyId ?? pack.id,
  _id: pack.id,
  slug: pack.slug,
  type: pack.type,
  category: pack.category || pack.type,
  name: pack.name,
  load: pack.load,
  kva: pack.kva,
  volt: pack.volt,
  options: composeOptions(pack, productsById).map(publicOption),
});

/** GET /admin/packages and admin write responses: the stored record with computed options. */
export const serializeAdminPackage = (pack, productsById) => {
  const { items: _items, ...rest } = pack;
  return { ...rest, options: composeOptions(pack, productsById) };
};

/** Order line snapshot fields for a priced (composed) option: components per 1 package. */
export const packageLineSnapshot = (option) => ({
  type: "package",
  components: option.items.map((item) => ({
    productId: item.productId,
    sku: item.sku,
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  })),
  productsTotal: option.productsTotal ?? null,
  priceAdjustment: Number(option.priceAdjustment) || 0,
});

// ---- write validation -------------------------------------------------------------------------

const optionItems = (option) => {
  const raw = option.items;
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw badRequest("Items must be a list.");
  if (raw.length > PACKAGE_LIMITS.optionItems) {
    throw badRequest(`An option can have at most ${PACKAGE_LIMITS.optionItems} products.`);
  }
  const seen = new Set();
  return raw.map((entry) => {
    if (!isPlainObject(entry)) throw badRequest("Invalid package item.");
    const productId = text(entry, "productId", { label: "Product", required: true, max: OPS_LIMITS.id });
    if (seen.has(productId)) throw badRequest("Each product can appear once per option.");
    seen.add(productId);
    return {
      productId,
      quantity: integer(entry, "quantity", { label: "Item quantity", required: true, min: 1, max: PACKAGE_LIMITS.itemQuantityMax }),
      note: text(entry, "note", { label: "Item note", max: PACKAGE_LIMITS.itemNote }) || null,
    };
  });
};

const SIGNED_INTEGER = /^-?\d{1,10}$/;
const adjustmentField = (option) => {
  const raw = option.priceAdjustment;
  if (raw === undefined || raw === null || raw === "") return 0;
  const value = typeof raw === "number" ? raw : typeof raw === "string" && SIGNED_INTEGER.test(raw.trim()) ? Number(raw) : Number.NaN;
  if (!Number.isInteger(value) || Math.abs(value) > PACKAGE_LIMITS.adjustmentMax) {
    throw badRequest("Price adjustment must be a whole number from -1,000,000,000 to 1,000,000,000.");
  }
  return value;
};

/**
 * Validated `options` for POST/PUT /admin/packages (§1.1). Composed options (with items)
 * store { name, items, priceAdjustment }; a sent price or kits is ignored. Legacy options
 * store { name, price, kits }. A top-level `items` list is rejected when any option has no
 * items, and is otherwise ignored.
 */
export const packageOptionsPayload = (body) => {
  const options = body?.options;
  if (!Array.isArray(options) || options.length === 0) throw badRequest("At least one package option is required.");
  if (options.length > PACKAGE_LIMITS.options) {
    throw badRequest(`A package can have at most ${PACKAGE_LIMITS.options} options.`);
  }
  const names = new Set();
  const parsed = options.map((option) => {
    if (!isPlainObject(option)) throw badRequest("Invalid package option.");
    const name = text(option, "name", { label: "Option name", required: true, max: PACKAGE_LIMITS.optionName });
    if (names.has(name.toLowerCase())) throw badRequest("Option names must be unique.");
    names.add(name.toLowerCase());
    const items = optionItems(option);
    if (items.length) return { name, items, priceAdjustment: adjustmentField(option) };
    const price = number(option, "price", { label: "Option price", required: true });
    if (!(price > 0) || price > PACKAGE_LIMITS.priceMax) {
      throw badRequest("Option price must be greater than 0 and at most 1,000,000,000.");
    }
    return {
      name,
      price,
      kits: text(option, "kits", { label: "Option kits", required: true, max: PACKAGE_LIMITS.optionKits, multiline: true }),
    };
  });
  if (hasItems(body.items) && parsed.some((option) => !isComposedOption(option))) throw badRequest(TOP_LEVEL_ITEMS_MESSAGE);
  return parsed;
};

/**
 * Checks composed options against the product catalog: every product exists and is not
 * archived, and the computed price is > 0.
 */
export const assertOptionProducts = (options, productsById) => {
  for (const option of options) {
    if (!isComposedOption(option)) continue;
    for (const item of option.items) {
      const product = productsById.get(item.productId);
      if (!product) throw badRequest("Product not found.");
      if (isArchived(product)) throw badRequest("Archived products can't be added to a package.");
    }
    if (!(composeOption(option, productsById).price > 0)) {
      throw badRequest(`Option ${option.name} price must be greater than 0.`);
    }
  }
};
