import { asyncHandler } from "../services/asyncHandler.js";
import { badRequest } from "../services/errors.js";
import { created, ok } from "../services/http.js";
import { appendCollectionItem, listCollection } from "../services/store.js";
import { optionalString, requiredString } from "../services/validators.js";

const findPackage = (packages, item) =>
  packages.find(
    (pack) =>
      pack.id === item.packageId ||
      pack.slug === item.packageId ||
      String(pack.legacyId) === String(item.id)
  );

const quoteItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw badRequest("Cart items are required.");
  }

  const packages = await listCollection("packages", { includeInactive: true });

  return items.map((item) => {
    const pack = findPackage(packages, item);
    if (!pack) throw badRequest(`Package ${item.packageId || item.id} was not found.`);

    const withSolar = String(item.withSolar) === "true" || item.optionName === "With solar";
    const option =
      pack.options.find((entry) =>
        withSolar ? entry.name === "With solar" : entry.name === "Without solar"
      ) || pack.options[0];
    const quantity = Math.max(Number(item.quantity || 1), 1);
    const lineTotal = option.price * quantity;

    return {
      packageId: pack.id,
      legacyId: pack.legacyId,
      name: pack.name,
      type: pack.type,
      kva: pack.kva,
      volt: pack.volt,
      optionName: option.name,
      kits: option.kits,
      price: option.price,
      quantity,
      lineTotal,
    };
  });
};

export const quoteCart = asyncHandler(async (req, res) => {
  const items = await quoteItems(req.body.items || req.body.cart);
  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
  ok(res, "Cart quoted.", { items, total });
});

export const saveCart = asyncHandler(async (req, res) => {
  const items = await quoteItems(req.body.items || req.body.cart);
  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const cart = await appendCollectionItem("carts", {
    name: optionalString(req.body, "name"),
    phoneNumber: optionalString(req.body, "phoneNumber"),
    emailAddress: optionalString(req.body, "emailAddress"),
    sessionId: requiredString(req.body, "sessionId", "Session id"),
    items,
    total,
    status: "open",
  });
  created(res, "Cart saved.", cart);
});

export const adminListCarts = asyncHandler(async (_req, res) => {
  const carts = await listCollection("carts", { includeInactive: true });
  ok(res, "Carts retrieved.", carts);
});
