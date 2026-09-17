import {
  contactNotificationTemplate,
  contactReplyTemplate,
  orderNotificationTemplate,
  subscriberNotificationTemplate,
} from "./emailTemplates.js";
import {
  ApiError,
  assertJsonContentType,
  badRequest,
  corsHeaders,
  created,
  decodeBody,
  describeError,
  finalizeResponse,
  getClientIpPrefix,
  json,
  normalizePath,
  notFound,
  ok,
  parseJsonBody,
  readBodyBytes,
  resolveRequestId,
} from "./http.js";
import {
  READ_TYPES,
  appendToArray,
  createCollectionItem,
  deleteCollectionItem,
  deleteRecordReads,
  findByField,
  getById,
  getCollectionItem,
  getReadStatus,
  listCollection,
  markAllRead,
  markRecordRead,
  now,
  readKey,
  recordActivity,
  resolveSlug,
  updateCollectionItem,
} from "./store.js";
import {
  CONTACT_STATUSES,
  LIMITS,
  NEWSLETTER_STATUSES,
  emailField,
  enumField,
  numericField,
  optionalBoolean,
  phoneField,
  slugField,
  stringField,
  stripInvalidChars,
  urlField,
  validateEmail,
  validateItems,
  validateNewPassword,
} from "./validation.js";
import { randomHex, timingSafeEqualStrings, verifySvixSignature, verifyTurnstile } from "./security.js";
import {
  EMAIL_ATTEMPT_LIMIT,
  PAIR_ATTEMPT_LIMIT,
  burnPasswordCheck,
  clearAllLoginCounters,
  clearLoginCounters,
  consumeResetToken,
  countLoginAttempt,
  createAdminToken,
  createResetToken,
  createSession,
  emailKey,
  enforceRateLimit,
  getSigningSecret,
  hitRateLimit,
  pairKey,
  pruneResetTokens,
  requireAdmin,
  revokeSession,
  seedSuperAdmin,
  touchLastLogin,
  verifyPassword,
} from "./auth.js";
import { changedFields, listAuditLogs, providedFields, recordAudit } from "./audit.js";
import { handleAdminUsers } from "./adminUsers.js";
import { handleAdminVacancies, handlePublicVacancies } from "./vacancies.js";
import { requireCapability } from "./capabilities.js";
import { adminSelf } from "../../shared/capabilities.js";
import { handleOpsAdmin, handleOpsPublic, handleOpsScheduled } from "./ops/index.js";
import { sendNotification } from "./email.js";
import { notify } from "./notifications.js";
import { newOrderNotification } from "../../shared/notifications.js";
import { SETTINGS_ID, mergeSettings, recipientsOr } from "../../shared/settings.js";
import { dashboardKpis, dashboardPeriod } from "../../shared/dashboard.js";
import { assertCategoryExists, packagesInCategory } from "../../shared/catalog.js";
import { idRef } from "../../shared/fields.js";
import {
  assertOptionProducts,
  packageLineSnapshot,
  packageOptionsPayload,
  packagesNeedCategories,
  packagesNeedProducts,
  serializeAdminPackage,
  serializePublicPackage,
  withComposedOptions,
} from "../../shared/packagePricing.js";
import {
  NEW_ORDER_FIELDS,
  isProductOrderItem,
  priceProductItem,
  productCartLine,
  productItemIds,
  productOrderLine,
  websiteRequiresInstallation,
} from "../../shared/orders.js";

const CONTACT_THREAD_PATTERN = /\[JE-CONTACT:([A-Za-z0-9-]{1,64})\]/i;
const DEFAULT_CONTACT_REPLY_SUBJECT = "Re: Your message to Juwon Electric";
const WEBHOOK_PATH = "/webhooks/contact-reply";
const WEBHOOK_CLAIM_TTL_MS = 24 * 60 * 60 * 1000;
const WEBHOOK_CLAIM_STALE_MS = 2 * 60 * 1000;
const RESEND_EMAIL_ID_PATTERN = /^[0-9a-fA-F-]{36}$/;
const RESEND_MAX_RESPONSE_BYTES = 1000000;
const CART_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const SUBSCRIBED_MESSAGE = "You're subscribed.";

const cleanContactThreadSubject = (subject) =>
  (subject || DEFAULT_CONTACT_REPLY_SUBJECT).replace(CONTACT_THREAD_PATTERN, "").trim();

// "/prefix/<id>" -> id (a single non-empty path segment), otherwise null.
const idAfter = (path, prefix) => {
  if (!path.startsWith(`${prefix}/`)) return null;
  const id = path.slice(prefix.length + 1);
  return id && !id.includes("/") ? id : null;
};

// ---------------------------------------------------------------------------
// Catalog payloads
// ---------------------------------------------------------------------------

const sortOrderField = (body) => {
  const value = numericField(body, "sortOrder", { label: "Sort order" });
  if (value !== undefined && (value < 0 || value > LIMITS.sortOrderMax)) {
    badRequest("Sort order must be between 0 and 1,000,000.");
  }
  return value;
};

const isActiveField = (body, existing) =>
  body?.isActive === undefined || body?.isActive === null
    ? existing
      ? undefined
      : true
    : optionalBoolean(body, "isActive", true, "isActive");

const legacyIdField = (body) => {
  const value = numericField(body, "legacyId", { label: "legacyId" });
  if (value !== undefined && (!Number.isInteger(value) || value < 0 || value > LIMITS.legacyIdMax)) {
    badRequest("legacyId must be a whole number from 0 to 1,000,000,000.");
  }
  return value;
};

const assertLegacyIdUnique = async (env, legacyId, excludeId = "") => {
  if (legacyId === undefined) return;
  const rows = await env.DB.prepare(
    "SELECT id, json_extract(data, '$.legacyId') AS legacy_id FROM records WHERE collection = 'packages' AND id != ?"
  )
    .bind(String(excludeId))
    .all();
  const clash = (rows.results || []).some((row) => {
    const other = row.legacy_id;
    if (other === null || other === undefined) return false;
    const text = String(other).trim();
    return /^\d+(\.\d+)?$/.test(text) && Number(text) === legacyId;
  });
  if (clash) throw new ApiError(409, `Another package already uses id ${legacyId}.`);
};

// Slug patch for catalog records: a sent slug is normalized and made unique; on update
// without a (non-blank) slug the stored slug is kept (derived only when the record has none).
const slugPatch = async (env, collection, body, existing, fallback) => {
  const input = slugField(body);
  if (existing && !input && existing.slug) return undefined;
  return resolveSlug(env, collection, { input, fallback, excludeId: existing?.id || "" });
};

const packagePayload = async (env, body, existing = null) => {
  const type = stringField(body, "type", { label: "Type", required: true, max: LIMITS.packageType }).toLowerCase();
  const name = stringField(body, "name", { label: "Name", required: true, max: LIMITS.packageName });
  const kva = numericField(body, "kva", { label: "kVA", required: true, maxLength: LIMITS.packageKva });
  if (!(kva > 0)) badRequest("kVA must be greater than 0.");
  const category = stringField(body, "category", { label: "Category", max: LIMITS.packageType });
  const legacyId = legacyIdField(body);
  // Catalogue category (COMMERCE_V3 §4): null clears it; absent keeps it on update.
  const categoryId = idRef(body, "categoryId", { label: "Category" });
  const load = stringField(body, "load", { label: "Load", required: true, max: LIMITS.packageLoad, multiline: true });
  const volt = numericField(body, "volt", { label: "Volt", maxLength: LIMITS.packageVolt });
  if (volt !== undefined && !(volt > 0)) badRequest("Volt must be greater than 0.");
  // Options carry their own products (COMMERCE_V2 §1.1); top-level items are deprecated.
  const options = packageOptionsPayload(body);
  const isActive = isActiveField(body, existing);
  const sortOrder = sortOrderField(body);
  slugField(body);
  if (categoryId) assertCategoryExists(await listCollection(env, "categories", { includeInactive: true }), categoryId);
  if (packagesNeedProducts([{ options }])) assertOptionProducts(options, await allProductsById(env));

  await assertLegacyIdUnique(env, legacyId, existing?.id);
  return {
    legacyId,
    type,
    // Blank optional text is not written on update.
    category: category || (existing ? undefined : type),
    categoryId: existing ? categoryId : categoryId ?? null,
    name,
    slug: await slugPatch(env, "packages", body, existing, `${name}-${type}-${kva}`),
    load,
    kva,
    // null clears volt; absent keeps it on update and stores null on create.
    volt: volt !== undefined ? volt : body.volt === null || !existing ? null : undefined,
    options,
    isActive,
    sortOrder,
    // Persists the read-time migration: an update clears the deprecated top-level items.
    items: existing ? [] : undefined,
  };
};

const allProductsById = async (env) =>
  new Map((await listCollection(env, "products", { includeInactive: true })).map((product) => [product.id, product]));

// Products by id when any of the packages has a composed option (prices are computed on read).
const productsForPackages = async (env, packages) => (packagesNeedProducts(packages) ? allProductsById(env) : new Map());

// Categories by id when any of the packages references one (for `categoryRef`, COMMERCE_V3 §4).
const categoriesForPackages = async (env, packages) =>
  packagesNeedCategories(packages)
    ? new Map((await listCollection(env, "categories", { includeInactive: true })).map((category) => [category.id, category]))
    : new Map();

const serializeAdminPackages = async (env, packages) => {
  const [products, categories] = await Promise.all([productsForPackages(env, packages), categoriesForPackages(env, packages)]);
  return packages.map((pack) => serializeAdminPackage(pack, products, categories));
};

const contentPayload = async (env, body, existing, kind) => {
  const isPortfolio = kind === "portfolio";
  const collection = isPortfolio ? "portfolio" : "services";
  const nameKey = isPortfolio ? "name" : "title";
  const name = stringField(body, nameKey, {
    label: isPortfolio ? "Name" : "Title",
    required: true,
    max: isPortfolio ? LIMITS.portfolioName : LIMITS.serviceTitle,
  });
  slugField(body);
  const image = urlField(body, "image", { label: "Image", required: true });
  let extra;
  if (isPortfolio) {
    const link = urlField(body, "link", { label: "Link" });
    extra = {
      link: link || (existing ? undefined : ""),
      featured: body.featured === undefined || body.featured === null ? (existing ? undefined : false) : optionalBoolean(body, "featured", false, "featured"),
      mobile: body.mobile === undefined || body.mobile === null ? (existing ? undefined : true) : optionalBoolean(body, "mobile", true, "mobile"),
    };
  } else {
    const subtitle = stringField(body, "subtitle", { label: "Subtitle", required: true, max: LIMITS.serviceSubtitle });
    const ctaLabel = stringField(body, "ctaLabel", { label: "CTA label", max: LIMITS.ctaLabel });
    const ctaUrl = urlField(body, "ctaUrl", { label: "CTA URL" });
    extra = {
      subtitle,
      ctaLabel: ctaLabel || (existing ? undefined : "Let's go"),
      ctaUrl: ctaUrl || (existing ? undefined : "/packages"),
    };
  }
  const isActive = isActiveField(body, existing);
  const sortOrder = sortOrderField(body);
  return {
    [nameKey]: name,
    slug: await slugPatch(env, collection, body, existing, name),
    image,
    ...extra,
    isActive,
    sortOrder,
  };
};

const segmentPayload = async (env, body, existing = null) => {
  const title = stringField(body, "title", { label: "Title", required: true, max: LIMITS.serviceTitle });
  slugField(body);
  const subtitle = stringField(body, "subtitle", { label: "Subtitle", required: true, max: LIMITS.serviceSubtitle });
  const image = urlField(body, "image", { label: "Image", required: true });
  const isActive = isActiveField(body, existing);
  const sortOrder = sortOrderField(body);
  return {
    title,
    slug: await slugPatch(env, "customerSegments", body, existing, title),
    subtitle,
    image,
    isActive,
    sortOrder,
  };
};

// Stored options in the same shape as validated ones, so unchanged options are not
// reported as changes.
const normalizeForAudit = (item) =>
  Array.isArray(item?.options)
    ? {
        ...item,
        options: item.options.map((option) => ({
          name: String(option?.name ?? ""),
          price: Number(option?.price),
          kits: String(option?.kits ?? ""),
        })),
      }
    : item;

// ---------------------------------------------------------------------------
// Dashboard helpers
// ---------------------------------------------------------------------------

const parseMoney = (value) => {
  if (typeof value === "number") return value;
  if (!value) return 0;
  return Number(String(value).replace(/[^\d.-]/g, "")) || 0;
};

const getOrderRevenue = (order) => {
  const total = parseMoney(order?.total);
  if (total) return total;
  return (order?.order || []).reduce((sum, item) => sum + parseMoney(item.price) * Number(item.quantity || 1), 0);
};

const normalizeOrderStatus = (status) => (["completed", "cancelled"].includes(status) ? status : "pending");

const getRevenueSeries = (orders) => {
  const buckets = orders.reduce((series, order) => {
    const date = new Date(order.receivedAt || order.createdAt || Date.now());
    if (Number.isNaN(date.getTime())) return series;
    const key = date.toISOString().slice(0, 10);
    return { ...series, [key]: (series[key] || 0) + getOrderRevenue(order) };
  }, {});
  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, value]) => ({
      label: new Date(key).toLocaleDateString("en-NG", { month: "short", day: "numeric", timeZone: "UTC" }),
      value,
    }));
};

// ---------------------------------------------------------------------------
// Pricing (items are shape-validated by validateItems before any of this runs)
// ---------------------------------------------------------------------------

const UNAVAILABLE_ITEMS_MESSAGE = "Some items in your cart are no longer available. Please refresh your cart.";

const matchText = (value) => String(value ?? "").trim().toLowerCase();
const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== "";

// Checkout historically sends display strings ("Inverter + tubular", "5kva + 48volt");
// normalize them to the raw package fields before matching.
const normalizeItemType = (value) => {
  const type = matchText(value);
  if (type === "hybrid inverter + lithium") return "hybrid lithium";
  return type.replace(/^inverter\s{0,5}\+\s{0,5}/, "");
};

// Anchored and bounded (inputs are also capped at 50 characters by validateItems).
const KVA_PATTERN = /^\s*(\d{1,6}(?:\.\d{1,3})?)\s*kva\b/i;
const VOLT_PATTERN = /(?:^|[^\d.])(\d{1,6}(?:\.\d{1,3})?)\s*volts?\b/i;

const parseItemKva = (item) => {
  const raw = item?.kva;
  const text = typeof raw === "string" ? raw : "";
  const kvaMatch = text ? KVA_PATTERN.exec(text) : null;
  const voltMatch = text ? VOLT_PATTERN.exec(text) : null;
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

// Resolution rule (kept identical to the Express backend):
// 1. Active packages whose public id (legacyId) equals item.id; if the item carries
//    type/name/kva, those must also match (case-insensitive, trimmed).
// 2. Otherwise fall back to type + name + kva (+ volt when the item includes it).
const resolvePackage = (packages, item) => {
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
      (pack) => hasValue(pack.legacyId) && String(pack.legacyId).trim() === String(item.id).trim() && matchesDescriptors(pack)
    );
    if (byId) return byId;
  }

  if (type === undefined || name === undefined || !kvaGiven) return null;
  return packages.find((pack) => matchesDescriptors(pack) && (!volt.given || sameNumberish(pack.volt, volt.value))) || null;
};

// An explicit optionName that is not found falls back to withSolar, then to the kits
// text, before the item is treated as unavailable. Without an explicit name the chain is
// withSolar, else kits text, else the first option.
const selectPackageOption = (pack, item) => {
  const options = Array.isArray(pack.options) ? pack.options : [];
  const byWithSolar = () => {
    if (!hasValue(item.withSolar)) return null;
    const withSolar = String(item.withSolar).trim().toLowerCase() === "true";
    return (
      options.find((option) => matchText(option.name) === (withSolar ? "with solar" : "without solar")) ||
      options[withSolar ? 1 : 0] ||
      null
    );
  };
  const byKits = () => {
    if (!hasValue(item.package)) return null;
    const description = matchText(item.package);
    return options.find((option) => hasValue(option.kits) && description.endsWith(matchText(option.kits))) || null;
  };

  const explicit = item.optionName ?? item.option;
  if (hasValue(explicit)) {
    return options.find((option) => matchText(option.name) === matchText(explicit)) || byWithSolar() || byKits() || null;
  }
  if (hasValue(item.withSolar)) return byWithSolar();
  return byKits() || options[0] || null;
};

// Active packages with computed options (COMMERCE_V2 §1.2): what carts and orders are priced on.
const loadActivePackages = async (env) => {
  const packages = await listCollection(env, "packages");
  const products = await productsForPackages(env, packages);
  return packages.map((pack) => withComposedOptions(pack, products));
};

// Packages (only when some item is a package) and the products named by product items
// (COMMERCE_V3 §3), at parity with loadPricingCatalog in backend/controllers/_pricing.js.
const loadPricingCatalog = async (env, validated) => {
  const needsPackages = validated.some((entry) => !isProductOrderItem(entry.item));
  const needsProducts = productItemIds(validated).length > 0;
  const [packages, products] = await Promise.all([
    needsPackages ? loadActivePackages(env) : [],
    needsProducts ? allProductsById(env) : new Map(),
  ]);
  return { packages, products };
};

const formatNaira = (amount) => `₦${new Intl.NumberFormat("en-US").format(amount)}`;

const describeKva = (pack) => `${pack.kva}kva ${pack.volt ? `+ ${pack.volt}volt` : ""}`.trim();
const describeType = (pack) =>
  matchText(pack.type) === "hybrid lithium" ? "Hybrid inverter + lithium" : `Inverter + ${pack.type}`;

const priceOrderItems = async (env, validated) => {
  const { packages, products } = await loadPricingCatalog(env, validated);
  const priced = validated.map((entry) => {
    const { item, quantity } = entry;
    if (isProductOrderItem(item)) {
      const product = priceProductItem(products, entry);
      if (!product) badRequest(UNAVAILABLE_ITEMS_MESSAGE);
      return productOrderLine(product);
    }
    const pack = resolvePackage(packages, item);
    const option = pack && selectPackageOption(pack, item);
    const unitPrice = option ? Number(option.price) || 0 : 0;
    if (!pack || !option || option.available === false || unitPrice <= 0) badRequest(UNAVAILABLE_ITEMS_MESSAGE);
    const kva = describeKva(pack);
    // Snapshot fields (COMMERCE_V2 §1.3); the display type label moves to typeLabel.
    return {
      package: option.kits ? `${kva} inverter with ${option.kits}` : `${kva} ${pack.name}`,
      ...packageLineSnapshot(option),
      typeLabel: describeType(pack),
      kva,
      volt: pack.volt ?? null,
      price: formatNaira(unitPrice),
      quantity,
      name: pack.name,
      packageId: pack.id,
      legacyId: pack.legacyId,
      optionName: option.name,
      unitPrice,
      lineTotal: unitPrice * quantity,
    };
  });
  const totalAmount = priced.reduce((sum, item) => sum + item.lineTotal, 0);
  return { items: priced, total: formatNaira(totalAmount), totalAmount };
};

const ITEM_UNAVAILABLE_MESSAGE = "This item is no longer available.";

// Prices each validated cart line. Lines that cannot be priced (inactive, removed or
// unmatched package/option) come back as { available: false, message }.
const quoteLines = async (env, validated) => {
  const { packages, products } = await loadPricingCatalog(env, validated);
  return validated.map((entry) => {
    const { item, quantity } = entry;
    if (isProductOrderItem(item)) {
      const product = priceProductItem(products, entry);
      return product ? { ...productCartLine(product), available: true } : { available: false, message: ITEM_UNAVAILABLE_MESSAGE };
    }
    const pack =
      (hasValue(item.packageId) && packages.find((entry) => entry.id === String(item.packageId))) ||
      resolvePackage(packages, item);
    const option = pack && selectPackageOption(pack, item);
    const unitPrice = option ? Number(option.price) || 0 : 0;
    if (!pack || !option || option.available === false || unitPrice <= 0) {
      return { available: false, message: ITEM_UNAVAILABLE_MESSAGE };
    }
    return {
      packageId: pack.id,
      legacyId: pack.legacyId,
      name: pack.name,
      type: pack.type,
      kva: pack.kva,
      volt: pack.volt,
      optionName: option.name,
      kits: option.kits,
      price: unitPrice,
      unitPrice,
      quantity,
      lineTotal: unitPrice * quantity,
      available: true,
    };
  });
};

// POST /cart saves only fully priceable carts (400 otherwise, as before).
const quoteValidatedItems = async (env, validated) => {
  const lines = await quoteLines(env, validated);
  if (lines.some((line) => !line.available)) badRequest(UNAVAILABLE_ITEMS_MESSAGE);
  return lines;
};

const sourceField = (body) => stringField(body, "source", { label: "Source", max: LIMITS.source }) || "client";

const routeRoot = () =>
  ok("Juwon Electric API", {
    modules: ["packages", "newsletter", "services", "portfolio", "contact", "cart", "orders"],
    runtime: "cloudflare-workers",
  });

// ---------------------------------------------------------------------------
// Inbound reply webhook
// ---------------------------------------------------------------------------

const INBOUND_ADDRESS = /^[^\s@<>]+@[^\s@<>]+$/;

const parseInboundAddress = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const match = /<([^<>\s]+@[^<>\s]+)>\s*$/.exec(raw);
  const address = (match ? match[1] : raw).trim().toLowerCase();
  return INBOUND_ADDRESS.test(address) ? address : "";
};

// Removes <tag ...>...</tag> blocks with indexOf scans (linear time).
const removeBlocks = (html, tag) => {
  const lower = html.toLowerCase();
  const open = `<${tag}`;
  const close = `</${tag}`;
  let out = "";
  let position = 0;
  for (;;) {
    const start = lower.indexOf(open, position);
    if (start === -1) return out + html.slice(position);
    out += `${html.slice(position, start)} `;
    const end = lower.indexOf(close, start + open.length);
    if (end === -1) return out;
    const gt = lower.indexOf(">", end);
    if (gt === -1) return out;
    position = gt + 1;
  }
};

export const stripHtml = (html) =>
  removeBlocks(removeBlocks(String(html || "").slice(0, LIMITS.inboundHtml), "script"), "style")
    .replace(/<br\b[^<>]*>/gi, "\n")
    .replace(/<\/(?:p|div)\s*>/gi, "\n")
    .replace(/<[^<>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const TOO_LARGE = Symbol("too-large");

// Reads at most maxBytes of a response body; returns TOO_LARGE when there is more.
const readCapped = async (response, maxBytes) => {
  const declared = Number(response.headers.get("Content-Length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    response.body?.cancel?.().catch?.(() => {});
    return TOO_LARGE;
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      reader.cancel().catch(() => {});
      return TOO_LARGE;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
};

// Resend's email.received event only carries metadata; the body is fetched from the API.
const fetchResendReceivedEmail = async (env, emailId) => {
  if (!env.RESEND_API_KEY) return null;
  let response;
  try {
    response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    console.error("Fetching inbound email from Resend failed:", describeError(error));
    throw new ApiError(502, "Unable to fetch the inbound email.");
  }
  if (!response.ok) {
    response.body?.cancel?.().catch?.(() => {});
    console.error(`Fetching inbound email from Resend failed with HTTP ${response.status}`);
    throw new ApiError(502, "Unable to fetch the inbound email.");
  }
  const text = await readCapped(response, RESEND_MAX_RESPONSE_BYTES);
  if (text === TOO_LARGE) {
    console.warn("Inbound email from Resend is larger than 1 MB; its body was not imported.");
    return TOO_LARGE;
  }
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    console.warn("Inbound email from Resend was not valid JSON.");
    return null;
  }
};

const claimWebhookEvent = async (env, ctx, id) => {
  const currentTime = Date.now();
  const token = randomHex(16);
  const row = await env.DB.prepare(
    `INSERT INTO webhook_claims (id, status, claim_token, claimed_at, updated_at) VALUES (?1, 'processing', ?2, ?3, ?3)
      ON CONFLICT(id) DO UPDATE SET status = 'processing', claim_token = ?2, claimed_at = ?3, updated_at = ?3
        WHERE webhook_claims.status = 'processing' AND webhook_claims.claimed_at < ?4
      RETURNING claim_token`
  )
    .bind(id, token, currentTime, currentTime - WEBHOOK_CLAIM_STALE_MS)
    .first();

  if (Math.random() < 0.05) {
    ctx?.waitUntil?.(
      env.DB.prepare("DELETE FROM webhook_claims WHERE updated_at < ?")
        .bind(currentTime - WEBHOOK_CLAIM_TTL_MS)
        .run()
        .catch((error) => console.warn("Webhook claim cleanup failed", describeError(error)))
    );
  }

  if (row?.claim_token === token) return { state: "claimed", token };
  const existing = await env.DB.prepare("SELECT status FROM webhook_claims WHERE id = ?").bind(id).first();
  return { state: existing?.status === "done" ? "done" : "busy" };
};

const completeWebhookEvent = (env, id, token) =>
  env.DB.prepare("UPDATE webhook_claims SET status = 'done', updated_at = ? WHERE id = ? AND claim_token = ?")
    .bind(Date.now(), id, token)
    .run();

const releaseWebhookEvent = (env, id, token) =>
  env.DB.prepare("DELETE FROM webhook_claims WHERE id = ? AND claim_token = ? AND status = 'processing'")
    .bind(id, token)
    .run()
    .catch((error) => console.warn("Releasing webhook claim failed", describeError(error)));

const ignoreWebhook = (reason) => {
  console.log(`Inbound webhook ignored: ${reason}`);
  return { ignored: true };
};

const asText = (value) => (typeof value === "string" ? value : "");

const processInboundReply = async (env, body) => {
  if (body.type !== undefined && body.type !== "email.received") return ignoreWebhook("unsupported event type");
  const isResendEvent = body.type === "email.received";
  if (isResendEvent && (!body.data || typeof body.data !== "object" || Array.isArray(body.data))) {
    return ignoreWebhook("event without data");
  }
  const source = isResendEvent ? body.data : body;

  let subject = asText(source.subject);
  let fromRaw = asText(source.fromEmail) || asText(source.from) || asText(source.sender);
  let message = (asText(source.text) || asText(source.body) || asText(source.message)).slice(0, LIMITS.inboundHtml);
  let truncated = false;

  if (isResendEvent && !message.trim()) {
    if (typeof source.email_id !== "string" || !RESEND_EMAIL_ID_PATTERN.test(source.email_id)) {
      return ignoreWebhook("invalid email_id");
    }
    const email = await fetchResendReceivedEmail(env, source.email_id);
    if (email === TOO_LARGE) return ignoreWebhook("inbound email larger than 1 MB");
    if (email) {
      message = asText(email.text).slice(0, LIMITS.inboundHtml);
      if (!message.trim()) message = stripHtml(asText(email.html).slice(0, LIMITS.inboundHtml));
      if (!subject) subject = asText(email.subject);
      if (!fromRaw) fromRaw = asText(email.from);
    }
  }

  const fromEmail = parseInboundAddress(stripInvalidChars(fromRaw.slice(0, 512)));
  subject = stripInvalidChars(subject.slice(0, LIMITS.inboundHtml)).trim();
  message = stripInvalidChars(message, true).trim();
  if (!fromEmail) return ignoreWebhook("missing or invalid sender address");
  if (!message) return ignoreWebhook("empty message");

  const tag = CONTACT_THREAD_PATTERN.exec(subject);
  let contact;
  if (tag) {
    contact = await getById(env, "contacts", tag[1]);
    if (!contact) return ignoreWebhook("tagged contact not found");
    if (String(contact.emailAddress || "").trim().toLowerCase() !== fromEmail) {
      return ignoreWebhook("sender does not match the tagged contact");
    }
  } else {
    contact = await findByField(env, "contacts", "emailAddress", fromEmail);
    if (!contact) return ignoreWebhook("no contact matches the sender");
  }

  if (subject.length > LIMITS.inboundSubject) {
    subject = subject.slice(0, LIMITS.inboundSubject);
    truncated = true;
  }
  if (message.length > LIMITS.inboundMessage) {
    message = message.slice(0, LIMITS.inboundMessage);
    truncated = true;
  }

  const receivedAt = now();
  await appendToArray(
    env,
    "contacts",
    contact.id,
    "inboundReplies",
    { fromEmail, subject, message, receivedAt, ...(truncated ? { truncated: true } : {}) },
    { lastInboundReplyAt: receivedAt }
  );
  return { contact: await updateCollectionItem(env, "contacts", contact.id, { status: "contacted" }) };
};

const handleInboundWebhook = async (request, env, ctx, rawBytes) => {
  let svixId = null;
  if (env.INBOUND_EMAIL_WEBHOOK_SIGNING_SECRET) {
    // Verify the raw bytes before parsing anything.
    svixId = await verifySvixSignature(request, env.INBOUND_EMAIL_WEBHOOK_SIGNING_SECRET, rawBytes);
  } else if (
    !env.INBOUND_EMAIL_WEBHOOK_SECRET ||
    !(await timingSafeEqualStrings(request.headers.get("x-webhook-secret") || "", env.INBOUND_EMAIL_WEBHOOK_SECRET))
  ) {
    throw new ApiError(401, "Invalid webhook secret.");
  }

  const body = parseJsonBody(decodeBody(rawBytes));

  let claim = null;
  if (svixId) {
    claim = await claimWebhookEvent(env, ctx, svixId);
    if (claim.state === "done") return ok("Webhook already processed.");
    if (claim.state === "busy") throw new ApiError(409, "Webhook is already being processed.");
  }

  try {
    const result = await processInboundReply(env, body);
    if (claim) await completeWebhookEvent(env, svixId, claim.token);
    return result.ignored ? ok("Webhook ignored.") : ok("Inbound reply recorded.", result.contact);
  } catch (error) {
    // Let the sender retry a delivery that did not get recorded.
    if (claim) await releaseWebhookEvent(env, svixId, claim.token);
    throw error;
  }
};

// ---------------------------------------------------------------------------
// Public routes
// ---------------------------------------------------------------------------

const publicWriteLimit = (request, env, ctx, path) =>
  enforceRateLimit(env, ctx, "publicWrite", `${path}:${getClientIpPrefix(request)}`);

const pruneCarts = (env, ctx) => {
  if (Math.random() >= 0.02) return;
  ctx?.waitUntil?.(
    env.DB.prepare("DELETE FROM records WHERE collection = 'carts' AND updated_at < ?")
      .bind(new Date(Date.now() - CART_RETENTION_MS).toISOString())
      .run()
      .catch((error) => console.warn("Cart cleanup failed", describeError(error)))
  );
};

const handlePublic = async (request, env, ctx, path, body, url) => {
  const vacancyResponse = await handlePublicVacancies(request, env, path, url);
  if (vacancyResponse) return vacancyResponse;

  if (request.method === "GET" && path === "/packages") {
    const active = await listCollection(env, "packages");
    // ?category=<id|slug>: packages in that category or its descendants (COMMERCE_V3 §4).
    const query = Object.fromEntries(url.searchParams);
    const packages =
      query.category !== undefined
        ? packagesInCategory(active, await listCollection(env, "categories", { includeInactive: true }), query)
        : active;
    const [products, categories] = await Promise.all([productsForPackages(env, packages), categoriesForPackages(env, packages)]);
    return ok("Packages retrieved.", packages.map((pack) => serializePublicPackage(pack, products, categories)));
  }

  const packageId = request.method === "GET" ? idAfter(path, "/packages") : null;
  if (packageId) {
    const item = await getCollectionItem(env, "packages", packageId);
    if (item.isActive === false) notFound("Package not found.");
    const [products, categories] = await Promise.all([productsForPackages(env, [item]), categoriesForPackages(env, [item])]);
    return ok("Package retrieved.", serializePublicPackage(item, products, categories));
  }

  if (request.method === "GET" && path === "/services") {
    const [offerings, customerSegments] = await Promise.all([
      listCollection(env, "services"),
      listCollection(env, "customerSegments"),
    ]);
    return ok("Services retrieved.", { offerings, customerSegments });
  }

  if (request.method === "GET" && path === "/portfolio") {
    const items = await listCollection(env, "portfolio");
    const data = url.searchParams.get("featured") === "true" ? items.filter((item) => item.featured) : items;
    return ok("Portfolio retrieved.", data);
  }

  const portfolioId = request.method === "GET" ? idAfter(path, "/portfolio") : null;
  if (portfolioId) {
    const item = await getCollectionItem(env, "portfolio", portfolioId);
    if (item.isActive === false) notFound("Portfolio item not found.");
    return ok("Portfolio item retrieved.", item);
  }

  if (request.method === "POST" && path === "/cart/quote") {
    const validated = validateItems(body.items || body.cart, "cart");
    await enforceRateLimit(env, ctx, "quote", getClientIpPrefix(request));
    // Per-line availability: unpriceable lines never fail the whole quote.
    const items = await quoteLines(env, validated);
    const unavailable = items.flatMap((line, index) => (line.available ? [] : [index]));
    const total = items.reduce((sum, line) => sum + (line.available ? line.lineTotal : 0), 0);
    return ok("Cart quoted.", { items, total, unavailable });
  }

  if (request.method === "POST" && path === "/cart") {
    const fields = {
      name: stringField(body, "name", { label: "Name", max: LIMITS.personName }),
      phoneNumber: phoneField(body, "phoneNumber"),
      emailAddress: emailField(body, "emailAddress"),
      sessionId: stringField(body, "sessionId", { label: "Session id", required: true, max: LIMITS.sessionId }),
    };
    const validated = validateItems(body.items || body.cart, "cart");
    await publicWriteLimit(request, env, ctx, path);
    await verifyTurnstile(request, env, body, "cart");

    const items = await quoteValidatedItems(env, validated);
    const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
    pruneCarts(env, ctx);
    const existing = await findByField(env, "carts", "sessionId", fields.sessionId);
    if (existing) {
      const contactFields = Object.fromEntries(Object.entries(fields).filter(([, value]) => value));
      return ok("Cart saved.", await updateCollectionItem(env, "carts", existing.id, { ...contactFields, items, total }));
    }
    const cart = await createCollectionItem(env, "carts", {
      ...fields,
      items,
      total,
      status: "open",
      receivedAt: now(),
    });
    return created("Cart saved.", cart);
  }

  if (request.method === "POST" && path === "/contact") {
    const fields = {
      name: stringField(body, "name", { label: "Name", required: true, max: LIMITS.personName }),
      phoneNumber: phoneField(body, "phoneNumber", { required: true }),
      emailAddress: emailField(body, "emailAddress"),
      message: stringField(body, "message", {
        label: "Message",
        required: true,
        max: LIMITS.contactMessage,
        multiline: true,
      }),
      source: sourceField(body),
    };
    await publicWriteLimit(request, env, ctx, path);
    await verifyTurnstile(request, env, body, "contact");

    const message = await createCollectionItem(env, "contacts", { ...fields, status: "new", receivedAt: now() });
    ctx.waitUntil(
      sendNotification(env, {
        to: env.ADMIN_NOTIFY_EMAIL,
        subject: "You have a message",
        text: `${message.name}\n${message.phoneNumber}\n${message.emailAddress}\n\n${message.message}`,
        html: contactNotificationTemplate(message),
      })
    );
    return created("Message sent.", message);
  }

  if (request.method === "POST" && path === "/subscribe") {
    const emailKeyName =
      body.emailAddress !== undefined && body.emailAddress !== null && body.emailAddress !== "" ? "emailAddress" : "email";
    const fields = {
      emailAddress: emailField(body, emailKeyName, { required: true }),
      name: stringField(body, "name", { label: "Name", max: LIMITS.personName }),
      source: sourceField(body),
    };
    await publicWriteLimit(request, env, ctx, path);
    await verifyTurnstile(request, env, body, "subscribe");

    // Same message for new and existing addresses (no enumeration beyond the status code).
    const existing = await findByField(env, "newsletters", "emailAddress", fields.emailAddress);
    if (existing) {
      if (existing.isActive === false || existing.status === "inactive") {
        await updateCollectionItem(env, "newsletters", existing.id, {
          isActive: true,
          ...(existing.status === "inactive" ? { status: "active" } : {}),
        });
      }
      return ok(SUBSCRIBED_MESSAGE, { emailAddress: fields.emailAddress });
    }

    const subscriber = await createCollectionItem(env, "newsletters", { ...fields, status: "new", receivedAt: now() });
    ctx.waitUntil(
      sendNotification(env, {
        to: env.ADMIN_NOTIFY_EMAIL,
        subject: "You have a new subscriber",
        text: subscriber.emailAddress,
        html: subscriberNotificationTemplate(subscriber),
      })
    );
    return created(SUBSCRIBED_MESSAGE, { emailAddress: subscriber.emailAddress });
  }

  if (request.method === "POST" && path === "/order") {
    const customer = {
      name: stringField(body, "name", { label: "Name", required: true, max: LIMITS.personName }),
      phoneNumber: phoneField(body, "phoneNumber", { required: true }),
      emailAddress: emailField(body, "emailAddress"),
      deliveryAddress: stringField(body, "deliveryAddress", {
        label: "Delivery address",
        required: true,
        max: LIMITS.deliveryAddress,
        multiline: true,
      }),
    };
    const source = sourceField(body);
    const validatedItems = validateItems(body.order, "order");
    await publicWriteLimit(request, env, ctx, path);
    await verifyTurnstile(request, env, body, "order");

    // Prices and totals are always recomputed from D1; client-sent price/total are ignored.
    const pricing = await priceOrderItems(env, validatedItems);
    const order = await createCollectionItem(env, "orders", {
      ...customer,
      order: pricing.items,
      total: pricing.total,
      totalAmount: pricing.totalAmount,
      ...NEW_ORDER_FIELDS,
      requiresInstallation: websiteRequiresInstallation(pricing.items),
      source,
      receivedAt: now(),
    });
    notify(env, ctx, newOrderNotification(order));
    const orderEmails = mergeSettings(await getById(env, "settings", SETTINGS_ID)).notifications.orderEmails;
    ctx.waitUntil(
      sendNotification(env, {
        to: recipientsOr(orderEmails, env.ADMIN_NOTIFY_EMAIL),
        subject: "You have a new order",
        text: `${order.name}\n${order.phoneNumber}\n${order.deliveryAddress}\nTotal: ${order.total}`,
        html: orderNotificationTemplate(order),
      })
    );
    return created("Order placed successfully.", order);
  }

  return null;
};

// ---------------------------------------------------------------------------
// Admin auth routes
// ---------------------------------------------------------------------------

const loginFailed = () => new ApiError(401, "Invalid username or password.");
const RESET_REQUEST_MESSAGE = "If the account exists, a password reset token has been sent.";

// Passwords follow the single-line string rules (type, trim, required, max, characters).
const passwordField = (body, key, label) => stringField(body, key, { label, required: true, max: LIMITS.passwordMax });

const usernameField = (body) =>
  validateEmail(stringField(body, "username", { label: "Username", required: true, max: LIMITS.email }), { required: true });

const devExposeResetToken = (request, env) => {
  if (env.DEV_EXPOSE_RESET_TOKEN !== "true") return false;
  try {
    return ["localhost", "127.0.0.1"].includes(new URL(request.url).hostname);
  } catch {
    return false;
  }
};

const handleAdminAuth = async (request, env, ctx, path, body) => {
  if (request.method === "POST" && path === "/admin/auth/login") {
    getSigningSecret(env);
    const email = usernameField(body);
    const password = passwordField(body, "password", "Password");
    const prefix = getClientIpPrefix(request);

    // Every counter moves atomically before any password hashing.
    await enforceRateLimit(env, ctx, "loginIp", prefix);
    await countLoginAttempt(env, ctx, pairKey(email, prefix), PAIR_ATTEMPT_LIMIT);
    await countLoginAttempt(env, ctx, emailKey(email), EMAIL_ATTEMPT_LIMIT);

    await seedSuperAdmin(env);
    const admin = await findByField(env, "admins", "email", email);
    const valid =
      admin && admin.isActive !== false && typeof admin.passwordHash === "string" && admin.passwordHash
        ? await verifyPassword(password, admin.passwordHash)
        : await burnPasswordCheck(password);
    if (!valid) {
      ctx.waitUntil(
        (async () => {
          const counter = await hitRateLimit(env, ctx, "loginFailedAudit", prefix);
          if (counter?.limited) return;
          await recordAudit(env, ctx, request, null, {
            action: "auth.login_failed",
            email,
            entity: null,
            summary: `Failed sign-in for ${email}`,
          });
        })().catch((error) => console.warn("Failed sign-in audit skipped", describeError(error)))
      );
      throw loginFailed();
    }

    await clearLoginCounters(env, email, prefix);
    const session = await createSession(env, ctx, request, admin);
    // A password reset that landed while this login was verifying wins.
    const fresh = await getById(env, "admins", admin.id);
    if (!fresh || fresh.isActive === false || fresh.passwordHash !== admin.passwordHash) {
      await revokeSession(env, session.id);
      throw loginFailed();
    }
    ctx.waitUntil(touchLastLogin(env, admin.id));
    recordAudit(env, ctx, request, admin, {
      action: "auth.login",
      summary: `${admin.email} signed in`,
    });
    return ok("Login successful.", {
      token: await createAdminToken(env, admin, session),
      admin: adminSelf(admin),
    });
  }

  if (request.method === "POST" && path === "/admin/auth/request-password-reset") {
    const email = usernameField(body);
    const prefix = getClientIpPrefix(request);
    await enforceRateLimit(env, ctx, "resetRequestIp", prefix);
    await enforceRateLimit(env, ctx, "resetRequestEmail", email);

    // Lookup, insert, audit and email happen after the response, so timing is the same
    // for existing and unknown accounts.
    const work = async () => {
      const { admin, token, expiresAt } = await createResetToken(env, email);
      recordAudit(env, ctx, request, admin, {
        action: "auth.password_reset_requested",
        email,
        summary: `Password reset requested for ${email}`,
      });
      if (token) {
        await sendNotification(env, {
          to: admin.email,
          subject: "Your Juwon Electric admin password reset token",
          text: `Your password reset token is: ${token}\n\nIt expires at ${expiresAt}. If you did not request this, you can ignore this email.`,
        });
      }
      if (Math.random() < 0.05) await pruneResetTokens(env);
      return token;
    };

    if (devExposeResetToken(request, env)) {
      const token = await work();
      return ok(RESET_REQUEST_MESSAGE, { email, ...(token ? { resetToken: token } : {}) });
    }
    ctx.waitUntil(work().catch((error) => console.error("Password reset request failed:", describeError(error))));
    return ok(RESET_REQUEST_MESSAGE, { email });
  }

  if (request.method === "POST" && path === "/admin/auth/reset-password") {
    const email = usernameField(body);
    const password = validateNewPassword(passwordField(body, "password", "New password"), email);
    const token = stringField(body, "token", { label: "Reset token", required: true, max: LIMITS.resetToken });
    await enforceRateLimit(env, ctx, "resetConfirmIp", getClientIpPrefix(request));

    const admin = await consumeResetToken(env, email, token, password);
    if (!admin) throw new ApiError(400, "Invalid or expired reset token.");
    ctx.waitUntil(clearAllLoginCounters(env, email));
    recordAudit(env, ctx, request, admin, {
      action: "auth.password_reset",
      entity: null,
      summary: `${admin.email} reset their password`,
    });
    return ok("Password reset successful.");
  }

  if (request.method === "GET" && path === "/admin/auth/me") {
    const { admin, isStatic } = await requireAdmin(request, env, ctx);
    return ok("Session retrieved.", { admin: adminSelf(admin, { isStatic }) });
  }

  if (request.method === "POST" && path === "/admin/auth/logout") {
    const { admin, sessionId, isStatic } = await requireAdmin(request, env, ctx);
    if (isStatic) {
      return ok("Static admin tokens cannot be signed out; remove ADMIN_TOKEN to revoke access.");
    }
    await revokeSession(env, sessionId);
    recordAudit(env, ctx, request, admin, { action: "auth.logout", summary: `${admin.email} signed out` });
    return ok("Signed out.");
  }

  return null;
};

// ---------------------------------------------------------------------------
// Admin routes
// ---------------------------------------------------------------------------

const ENTITY_LABELS = {
  package: "package",
  service: "service",
  portfolio: "portfolio item",
  customerSegment: "customer segment",
};

const labelOf = (item) => item?.name || item?.title || item?.emailAddress || item?.id;

const optionalNote = (body) =>
  body.note !== undefined && body.note !== null
    ? stringField(body, "note", { label: "Note", max: LIMITS.orderNote, multiline: true })
    : undefined;

const optionalIsActive = (body) =>
  body.isActive !== undefined && body.isActive !== null ? optionalBoolean(body, "isActive", true, "isActive") : undefined;

// Read rows of a deleted record are removed for every admin; failures are only logged.
const forgetRecordReads = async (env, type, id) => {
  try {
    await deleteRecordReads(env, readKey(type, id));
  } catch (error) {
    console.error("Failed to delete read status:", describeError(error));
  }
};

const MAX_READ_ID_LENGTH = 64;
const READ_TYPE_CAPABILITY = { contacts: "leads:read", orders: "orders:read" };

const handleReads = async (env, method, path, body, admin) => {
  if (method === "GET" && path === "/admin/reads") {
    return ok("Read status retrieved.", await getReadStatus(env, admin.id));
  }
  if (method === "POST" && path === "/admin/reads") {
    const { type, id } = body;
    if (typeof type === "string" && Object.hasOwn(READ_TYPE_CAPABILITY, type)) {
      requireCapability(admin, READ_TYPE_CAPABILITY[type]);
    }
    if (typeof type !== "string" || !READ_TYPES.includes(type)) badRequest("Type must be contacts or orders.");
    if (typeof id !== "string" || !id.trim() || id.length > MAX_READ_ID_LENGTH) badRequest("Id is required.");
    const record = await getCollectionItem(env, type, id);
    const key = readKey(type, record.id);
    const readAt = await markRecordRead(env, admin.id, key, Math.max(Date.now(), recordActivity(type, record)));
    return ok("Marked as read.", { key, readAt });
  }
  if (method === "POST" && path === "/admin/reads/all") {
    const lists = await Promise.all(READ_TYPES.map((type) => listCollection(env, type, { includeInactive: true })));
    const newest = READ_TYPES.reduce(
      (latest, type, index) =>
        lists[index].reduce((max, record) => Math.max(max, recordActivity(type, record)), latest),
      0
    );
    return ok("All marked as read.", await markAllRead(env, admin.id, Math.max(Date.now(), newest)));
  }
  return null;
};

const handleAdmin = async (request, env, ctx, path, body, admin, url) => {
  const audit = (entry) => recordAudit(env, ctx, request, admin, entry);
  const { method } = request;
  // Capability guard (API_CONTRACT_V3 §1.2); mirrors backend/routes/admin.js.
  const can = (...capabilities) => requireCapability(admin, ...capabilities);

  const crud = async ({ entity, collection, id, payloadFor, messages, serialize = async (item) => item }) => {
    if (method === "PUT" || method === "DELETE") can("content:write");
    if (method === "PUT") {
      const existing = await getCollectionItem(env, collection, id);
      const payload = await payloadFor(body, existing);
      const item = await updateCollectionItem(env, collection, existing.id, payload);
      audit({
        action: `${entity}.update`,
        entity,
        entityId: item.id,
        summary: `Updated ${ENTITY_LABELS[entity]} "${labelOf(item)}"`,
        changes: changedFields(normalizeForAudit(existing), payload),
      });
      return ok(messages.update, await serialize(item));
    }
    if (method === "DELETE") {
      const existing = await getCollectionItem(env, collection, id);
      const item = await deleteCollectionItem(env, collection, existing);
      audit({
        action: `${entity}.delete`,
        entity,
        entityId: item.id,
        summary: `Deleted ${ENTITY_LABELS[entity]} "${labelOf(item)}"`,
      });
      return ok(messages.delete, await serialize(item));
    }
    return null;
  };

  const create = async ({ entity, collection, payload, message, slugFallback, serialize = async (item) => item }) => {
    can("content:write");
    const item = await createCollectionItem(env, collection, payload, { slugFallback });
    audit({
      action: `${entity}.create`,
      entity,
      entityId: item.id,
      summary: `Created ${ENTITY_LABELS[entity]} "${labelOf(item)}"`,
      changes: providedFields(payload),
    });
    return created(message, await serialize(item));
  };

  // Read status: not audited (it never changes records).
  const readsResponse = await handleReads(env, method, path, body, admin);
  if (readsResponse) return readsResponse;

  const usersResponse = await handleAdminUsers(request, env, ctx, path, body, admin, url, { sendNotification });
  if (usersResponse) return usersResponse;

  const vacanciesResponse = await handleAdminVacancies(request, env, ctx, path, body, admin, url);
  if (vacanciesResponse) return vacanciesResponse;

  if (method === "GET" && path === "/admin/audit-logs") {
    can("audit:read");
    return ok("Audit logs retrieved.", await listAuditLogs(env, url.searchParams));
  }

  if (method === "GET" && path === "/admin/dashboard") {
    can("dashboard:read");
    const nowMs = Date.now();
    const period = dashboardPeriod(Object.fromEntries(url.searchParams), nowMs);
    const [orders, contacts, newsletter, products, vacancies, jobs] = await Promise.all([
      listCollection(env, "orders", { includeInactive: true }),
      listCollection(env, "contacts", { includeInactive: true }),
      listCollection(env, "newsletters", { includeInactive: true }),
      listCollection(env, "products", { includeInactive: true }),
      listCollection(env, "vacancies", { includeInactive: true }),
      listCollection(env, "installationJobs", { includeInactive: true }),
    ]);
    const statusCounts = orders.reduce((counts, order) => {
      const status = normalizeOrderStatus(order.status);
      return { ...counts, [status]: (counts[status] || 0) + 1 };
    }, {});
    const totalRevenue = orders.reduce((sum, order) => sum + getOrderRevenue(order), 0);
    const recentOrders = [...orders]
      .sort((a, b) => new Date(b.receivedAt || b.createdAt || 0) - new Date(a.receivedAt || a.createdAt || 0))
      .slice(0, 5)
      .map((order) => ({
        id: order.id,
        name: order.name,
        phoneNumber: order.phoneNumber,
        deliveryAddress: order.deliveryAddress,
        status: normalizeOrderStatus(order.status),
        revenue: getOrderRevenue(order),
        receivedAt: order.receivedAt || order.createdAt,
      }));
    return ok("Dashboard retrieved.", {
      stats: {
        totalRevenue,
        orderCount: orders.length,
        pendingOrders: orders.filter((order) => normalizeOrderStatus(order.status) === "pending").length,
        completedOrders: orders.filter((order) => order.status === "completed").length,
        leadCount: contacts.length + newsletter.length,
        contactCount: contacts.length,
        subscriberCount: newsletter.length,
      },
      statusCounts,
      revenueSeries: getRevenueSeries(orders),
      recentOrders,
      kpis: dashboardKpis({ orders, products, vacancies, jobs }, period, nowMs),
    });
  }

  // Packages
  if (method === "GET" && path === "/admin/packages") {
    can("content:read");
    return ok("Packages retrieved.", await serializeAdminPackages(env, await listCollection(env, "packages", { includeInactive: true })));
  }
  const serializePackage = async (item) => (await serializeAdminPackages(env, [item]))[0];
  if (method === "POST" && path === "/admin/packages") {
    can("content:write");
    const payload = await packagePayload(env, body);
    return create({ entity: "package", collection: "packages", payload, message: "Package created.", serialize: serializePackage });
  }
  const packageId = idAfter(path, "/admin/packages");
  if (packageId) {
    const response = await crud({
      entity: "package",
      collection: "packages",
      id: packageId,
      payloadFor: (input, existing) => packagePayload(env, input, existing),
      messages: { update: "Package updated.", delete: "Package deleted." },
      serialize: serializePackage,
    });
    if (response) return response;
  }

  // Services and customer segments
  if (method === "GET" && path === "/admin/services") {
    can("content:read");
    const [offerings, customerSegments] = await Promise.all([
      listCollection(env, "services", { includeInactive: true }),
      listCollection(env, "customerSegments", { includeInactive: true }),
    ]);
    return ok("Services retrieved.", { offerings, customerSegments });
  }
  if (method === "POST" && path === "/admin/services") {
    can("content:write");
    const payload = await contentPayload(env, body, null, "services");
    return create({ entity: "service", collection: "services", payload, message: "Service created." });
  }
  const segmentId = idAfter(path, "/admin/services/customer-segments");
  if (segmentId) {
    const response = await crud({
      entity: "customerSegment",
      collection: "customerSegments",
      id: segmentId,
      payloadFor: (input, existing) => segmentPayload(env, input, existing),
      messages: { update: "Customer segment updated.", delete: "Customer segment deleted." },
    });
    if (response) return response;
  }
  if (method === "POST" && path === "/admin/services/customer-segments") {
    can("content:write");
    const payload = await segmentPayload(env, body);
    return create({
      entity: "customerSegment",
      collection: "customerSegments",
      payload,
      message: "Customer segment created.",
    });
  }
  const serviceId = idAfter(path, "/admin/services");
  if (serviceId && serviceId !== "customer-segments") {
    const response = await crud({
      entity: "service",
      collection: "services",
      id: serviceId,
      payloadFor: (input, existing) => contentPayload(env, input, existing, "services"),
      messages: { update: "Service updated.", delete: "Service deleted." },
    });
    if (response) return response;
  }

  // Portfolio
  if (method === "GET" && path === "/admin/portfolio") {
    can("content:read");
    return ok("Portfolio retrieved.", await listCollection(env, "portfolio", { includeInactive: true }));
  }
  if (method === "POST" && path === "/admin/portfolio") {
    can("content:write");
    const payload = await contentPayload(env, body, null, "portfolio");
    return create({ entity: "portfolio", collection: "portfolio", payload, message: "Portfolio item created." });
  }
  const portfolioId = idAfter(path, "/admin/portfolio");
  if (portfolioId) {
    const response = await crud({
      entity: "portfolio",
      collection: "portfolio",
      id: portfolioId,
      payloadFor: (input, existing) => contentPayload(env, input, existing, "portfolio"),
      messages: { update: "Portfolio item updated.", delete: "Portfolio item deleted." },
    });
    if (response) return response;
  }

  // Contacts
  if (method === "GET" && path === "/admin/contacts") {
    can("leads:read");
    return ok("Messages retrieved.", await listCollection(env, "contacts", { includeInactive: true }));
  }
  const replyMatch = /^\/admin\/contacts\/([^/]+)\/reply$/.exec(path);
  if (replyMatch && method === "POST") {
    can("leads:write");
    const rawSubject = stringField(body, "subject", { label: "Subject", max: LIMITS.replySubject });
    const reply = stringField(body, "message", {
      label: "Reply message",
      required: true,
      max: LIMITS.replyMessage,
      multiline: true,
    });
    const contact = await getCollectionItem(env, "contacts", replyMatch[1]);
    if (!contact.emailAddress) badRequest("This contact did not provide an email address.");
    const subject = cleanContactThreadSubject(rawSubject);
    const delivery = await sendNotification(env, {
      to: contact.emailAddress,
      subject,
      text: reply,
      html: contactReplyTemplate({ name: contact.name, originalMessage: contact.message, reply }),
    });
    if (delivery.skipped || delivery.failed) {
      // Matches the Express backend: never record a reply that was not delivered.
      throw new ApiError(502, "Unable to send the reply email. Please try again.");
    }
    const sentAt = now();
    await appendToArray(
      env,
      "contacts",
      contact.id,
      "replies",
      { subject, message: reply, sentAt, sentBy: admin.email },
      { lastRepliedAt: sentAt }
    );
    const message = await updateCollectionItem(env, "contacts", contact.id, { status: "contacted" });
    audit({
      action: "contact.reply",
      entity: "contact",
      entityId: contact.id,
      summary: `Replied to ${contact.name || contact.emailAddress}`,
      changes: ["status", "replies", "lastRepliedAt"],
    });
    return ok("Reply sent.", message);
  }
  const contactId = idAfter(path, "/admin/contacts");
  if (contactId && method === "PUT") {
    can("leads:write");
    const existing = await getCollectionItem(env, "contacts", contactId);
    const status = enumField(body, "status", CONTACT_STATUSES, { label: "Status", existing: existing.status });
    const payload = { status, note: optionalNote(body), isActive: optionalIsActive(body) };
    const message = await updateCollectionItem(env, "contacts", existing.id, payload);
    audit({
      action: "contact.update",
      entity: "contact",
      entityId: existing.id,
      summary: `Updated message from ${existing.name || existing.emailAddress || existing.id}`,
      changes: changedFields(existing, payload),
    });
    return ok("Message updated.", message);
  }
  if (contactId && method === "DELETE") {
    can("leads:write");
    const existing = await getCollectionItem(env, "contacts", contactId);
    await deleteCollectionItem(env, "contacts", existing);
    await forgetRecordReads(env, "contacts", existing.id);
    audit({
      action: "contact.delete",
      entity: "contact",
      entityId: existing.id,
      summary: `Deleted message from ${existing.name || existing.emailAddress || existing.id}`,
    });
    return ok("Message deleted.", existing);
  }

  // Newsletter
  if (method === "GET" && path === "/admin/newsletter") {
    can("leads:read");
    return ok("Subscribers retrieved.", await listCollection(env, "newsletters", { includeInactive: true }));
  }
  const subscriberId = idAfter(path, "/admin/newsletter");
  if (subscriberId && method === "PUT") {
    can("leads:write");
    const existing = await getCollectionItem(env, "newsletters", subscriberId);
    const status = enumField(body, "status", NEWSLETTER_STATUSES, { label: "Status", existing: existing.status });
    const payload = { status, isActive: optionalIsActive(body) };
    const subscriber = await updateCollectionItem(env, "newsletters", existing.id, payload);
    audit({
      action: "newsletter.update",
      entity: "newsletter",
      entityId: existing.id,
      summary: `Updated subscriber ${existing.emailAddress || existing.id}`,
      changes: changedFields(existing, payload),
    });
    return ok("Subscriber updated.", subscriber);
  }
  if (subscriberId && method === "DELETE") {
    can("leads:write");
    const existing = await getCollectionItem(env, "newsletters", subscriberId);
    await deleteCollectionItem(env, "newsletters", existing);
    audit({
      action: "newsletter.delete",
      entity: "newsletter",
      entityId: existing.id,
      summary: `Deleted subscriber ${existing.emailAddress || existing.id}`,
    });
    return ok("Subscriber deleted.", existing);
  }

  // Carts and orders
  if (method === "GET" && path === "/admin/carts") {
    can("orders:read");
    return ok("Carts retrieved.", await listCollection(env, "carts", { includeInactive: true }));
  }

  // Orders (GET, PUT, DELETE and fulfilment actions): src/ops/orders.js.

  return null;
};

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const handleHealth = async (env) => {
  try {
    await env.DB.prepare("SELECT 1 AS ok").first();
    return json({ success: true, status: "ok" });
  } catch (error) {
    console.error("Health check failed:", describeError(error));
    return json({ success: false, status: "unavailable" }, 503);
  }
};

const route = async (incoming, env, ctx, path) => {
  if (!corsHeaders(incoming, env).allowed) {
    return json({ success: false, message: "Origin not allowed." }, 403);
  }
  if (incoming.method === "OPTIONS") return new Response(null, { status: 204 });
  if (path === null) return json({ success: false, message: "Route not found." }, 404);

  // HEAD behaves exactly like GET; finalizeResponse drops the body.
  const request = incoming.method === "HEAD" ? new Request(incoming, { method: "GET" }) : incoming;
  const url = new URL(request.url);

  if (request.method === "GET" && path === "/health") return handleHealth(env);

  const isWebhook = request.method === "POST" && path === WEBHOOK_PATH;
  if (!isWebhook) assertJsonContentType(request);
  const rawBytes = await readBodyBytes(request);

  if (isWebhook) return handleInboundWebhook(request, env, ctx, rawBytes);

  const body = parseJsonBody(decodeBody(rawBytes));

  if (request.method === "GET" && path === "/") return routeRoot();

  const authResponse = await handleAdminAuth(request, env, ctx, path, body);
  if (authResponse) return authResponse;

  if (path === "/admin" || path.startsWith("/admin/")) {
    const { admin } = await requireAdmin(request, env, ctx);
    // v3 modules first: they own /admin/orders* (src/ops/orders.js).
    const opsResponse = await handleOpsAdmin({
      request,
      env,
      ctx,
      path,
      body,
      url,
      admin,
      audit: (entry) => recordAudit(env, ctx, request, admin, entry),
      sendNotification: (message) => sendNotification(env, message),
    });
    if (opsResponse) return opsResponse;
    const response = await handleAdmin(request, env, ctx, path, body, admin, url);
    if (response) return response;
  }

  const opsPublicResponse = await handleOpsPublic({ request, env, ctx, path, body, url });
  if (opsPublicResponse) return opsPublicResponse;

  const publicResponse = await handlePublic(request, env, ctx, path, body, url);
  if (publicResponse) return publicResponse;

  return json({ success: false, message: "Route not found." }, 404);
};

const errorResponse = (error, requestId) => {
  // Errors from backend/shared carry expose === true and a statusCode.
  if (!(error instanceof ApiError) && !(error?.expose === true && Number.isInteger(error?.statusCode))) {
    console.error(`[${requestId}] Unhandled worker error:`, describeError(error));
    return json({ success: false, message: "Something went wrong." }, 500);
  }
  const statusCode = error.statusCode || 500;
  if (statusCode >= 500) console.error(`[${requestId}] ${statusCode} ${error.message}`);
  return json(
    { success: false, message: error.message || "Something went wrong.", details: error.details },
    statusCode,
    error.headers
  );
};

export default {
  async fetch(request, env, ctx) {
    const requestId = resolveRequestId(request);
    let path;
    try {
      path = normalizePath(new URL(request.url));
    } catch {
      path = null;
    }

    let response;
    try {
      response = await route(request, env, ctx, path);
    } catch (error) {
      response = errorResponse(error, requestId);
    }
    return finalizeResponse(response, request, env, path, requestId);
  },

  // Cron triggers (wrangler.toml): daily low-stock digest.
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      handleOpsScheduled(env, (message) => sendNotification(env, message)).catch((error) =>
        console.error("Scheduled low-stock digest failed:", describeError(error))
      )
    );
  },
};
