import type { OrderItem, ProductOrderItem } from "@/lib/api/types";
import { getAmount } from "@/lib/format";
import type { ProductCartItem } from "./productStore";
import { isWithSolar, type CartItem } from "./store";

/**
 * Maps a stored cart item to the item shape the checkout sends to POST /order and POST /cart/quote.
 * Port of frontend/src/pages/Checkout/orderItems.js: the display strings (kva, type, package, price) are kept as
 * the backends parse them; prices are always recomputed on the server.
 */
export const toOrderItem = (item: CartItem): OrderItem => {
  const withSolar = isWithSolar(item);
  const kva = `${item.kva}kva ${item.volt ? "+ " + item.volt + "volt" : ""}`.trim();
  return {
    id: item.id,
    name: item.name,
    volt: item.volt ?? null,
    withSolar,
    optionName: item.options?.[withSolar ? 1 : 0]?.name,
    kva,
    price: "₦" + getAmount(item.price),
    package: `${kva} inverter with ${item.package}`,
    type: item.type === "hybrid lithium" ? "Hybrid inverter + lithium" : `Inverter + ${item.type}`,
    quantity: item.quantity,
  };
};

/** Base label shared by the cart row and checkout summary. */
export const cartItemBaseLabel = (item: Pick<CartItem, "type" | "kva">) =>
  String(item?.type ?? "").toLowerCase() === "hybrid lithium"
    ? `${item?.kva}kva hybrid inverter + lithium battery`
    : `${item?.kva}kva inverter with ${item?.type} battery`;

/** Short label for a checkout summary line, matching the cart page wording. */
export const cartItemLabel = (item: CartItem) => `${cartItemBaseLabel(item)}${isWithSolar(item) ? " (with solar)" : ""}`;

/** Commerce v3 §3.1: a product line as sent to POST /cart/quote and POST /order, after the package items. */
export const toProductOrderItem = (item: Pick<ProductCartItem, "productId" | "quantity">): ProductOrderItem => ({
  type: "product",
  productId: item.productId,
  quantity: item.quantity,
});
