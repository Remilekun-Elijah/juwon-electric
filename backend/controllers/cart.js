import { loadPricingCatalog, priceEntry, priceItems } from "./_pricing.js";
import { productCartLine } from "../shared/orders.js";
import { LIMITS as RATE_LIMITS, enforceLimit } from "../middleware/rateLimit.js";
import { takeTurnstileToken, verifyTurnstile } from "../middleware/turnstile.js";
import { asyncHandler } from "../services/asyncHandler.js";
import { created, ok } from "../services/http.js";
import { track } from "../services/runtime.js";
import {
  deleteCollectionItemsBefore,
  listCollection,
  upsertCollectionItem,
} from "../services/store.js";
import {
  LIMITS,
  optionalPhone,
  optionalString,
  requiredString,
  validateEmail,
  validatePricingItems,
} from "../services/validators.js";

const CART_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const CART_PRUNE_INTERVAL_MS = 60 * 60 * 1000;
let lastCartPruneAt = 0;

const pruneOldCarts = () => {
  const now = Date.now();
  if (now - lastCartPruneAt < CART_PRUNE_INTERVAL_MS) return;
  lastCartPruneAt = now;
  track(
    deleteCollectionItemsBefore(
      "carts",
      "updatedAt",
      new Date(now - CART_RETENTION_MS).toISOString()
    ).catch((error) => console.warn("Pruning old carts failed:", error?.name, error?.message))
  );
};

export const ITEM_UNAVAILABLE_MESSAGE = "This item is no longer available.";

const packageCartLine = ({ pack, option, unitPrice, quantity, lineTotal }) => ({
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
  lineTotal,
});

const cartLine = (priced) => (priced.product ? productCartLine(priced) : packageCartLine(priced));

// Prices are always taken from the active package catalog and current product prices.
const quoteItems = async (validated) => {
  const catalog = await loadPricingCatalog(validated);
  return priceItems(catalog, validated, { kind: "cart" }).map((line) => ({ ...cartLine(line), available: true }));
};

const bodyItems = (body) => body?.items ?? body?.cart;

// Lines that can't be priced don't fail the quote: they come back as
// { available: false, message } in their original position and are left out
// of the total; `unavailable` lists their indexes.
export const quoteCart = asyncHandler(async (req, res) => {
  const validated = validatePricingItems(bodyItems(req.body), "cart");
  await enforceLimit(req, res, "public-quote", RATE_LIMITS.quote);
  const catalog = await loadPricingCatalog(validated);
  const unavailable = [];
  const items = validated.map((entry, index) => {
    const priced = priceEntry(catalog, entry, { kind: "cart" });
    if (!priced) {
      unavailable.push(index);
      return { available: false, message: ITEM_UNAVAILABLE_MESSAGE };
    }
    return { ...cartLine(priced), available: true };
  });
  const total = items.reduce((sum, item) => sum + (item.available ? item.lineTotal : 0), 0);
  ok(res, "Cart quoted.", { items, total, unavailable });
});

export const saveCart = asyncHandler(async (req, res) => {
  const turnstileToken = takeTurnstileToken(req.body);
  const customer = {
    name: optionalString(req.body, "name", { label: "Name", max: LIMITS.personName }),
    phoneNumber: optionalPhone(req.body),
    emailAddress: validateEmail(
      optionalString(req.body, "emailAddress", { label: "Email address", max: LIMITS.email })
    ),
    sessionId: requiredString(req.body, "sessionId", "Session id", { max: LIMITS.sessionId }),
  };
  const validated = validatePricingItems(bodyItems(req.body), "cart");

  await enforceLimit(req, res, "public-cart", RATE_LIMITS.publicWrite);
  await verifyTurnstile(req, turnstileToken, "cart");

  const items = await quoteItems(validated);
  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const { item: cart, created: isNew } = await upsertCollectionItem(
    "carts",
    { sessionId: customer.sessionId },
    {
      create: { ...customer, items, total, status: "open", receivedAt: new Date().toISOString() },
      update: () => ({
        items,
        total,
        ...(customer.name ? { name: customer.name } : {}),
        ...(customer.phoneNumber ? { phoneNumber: customer.phoneNumber } : {}),
        ...(customer.emailAddress ? { emailAddress: customer.emailAddress } : {}),
      }),
    }
  );
  pruneOldCarts();
  if (isNew) created(res, "Cart saved.", cart);
  else ok(res, "Cart saved.", cart);
});

export const adminListCarts = asyncHandler(async (_req, res) => {
  const carts = await listCollection("carts", { includeInactive: true });
  ok(res, "Carts retrieved.", carts);
});
