import { getAmount } from "../../utils/helper";

/**
 * Maps a stored cart item to the item shape the checkout sends to POST /order and
 * POST /cart/quote. The display strings (kva, type, package, price) are kept as the
 * backends parse them; prices are always recomputed on the server.
 */
export const toOrderItem = (a) => {
  const p = {};
  const withSolar = a.withSolar === true || a.withSolar === "true";
  p.id = a.id;
  p.name = a.name;
  p.volt = a.volt ?? null;
  p.withSolar = withSolar;
  p.optionName = a.options?.[withSolar ? 1 : 0]?.name;
  p.kva = `${a.kva}kva ${a.volt ? "+ " + a.volt + "volt" : ""}`.trim();
  p.price = "₦" + getAmount(a.price);
  p.package = `${p.kva} inverter with ${a.package}`;
  p.type =
    a.type === "hybrid lithium"
      ? "Hybrid inverter + lithium"
      : `Inverter + ${a.type}`;
  p.quantity = a.quantity;

  return p;
};

/** Short label for a checkout summary line, matching the cart page wording. */
export const cartItemLabel = (item) => {
  const base =
    String(item?.type ?? "").toLowerCase() === "hybrid lithium"
      ? `${item?.kva}kva hybrid inverter + lithium battery`
      : `${item?.kva}kva inverter with ${item?.type} battery`;
  const solar = item?.withSolar === true || item?.withSolar === "true";
  return `${base}${solar ? " (with solar)" : ""}`;
};
