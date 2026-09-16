import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { applyQuotePrices, getCartItemKey } from "../../features/cart";
import { apiRequest } from "../../utils/api";
import { toOrderItem } from "./orderItems";

// Server-side prices for the checkout (POST /cart/quote).
//
// Response shape assumed (Express and Worker today):
//   200 { success, data: { items: [{ price, quantity, lineTotal, ... }], total } }
// with `items` in request order. `price`/`total` may be numbers or "₦1,000" strings;
// `unitPrice`/`totalAmount` are preferred when present. A per-line `available: false`
// (or `unavailable: true`) is honoured if a backend ever reports it.
// When any line can't be priced both backends reject the whole request with 400
// "Some items in your cart are no longer available…"; the unavailable lines are then
// found by quoting halves of the cart (bounded number of requests).

const QUOTE_TIMEOUT_MS = 15000;
const MAX_QUOTE_REQUESTS = 16;

export const QUOTE_FALLBACK_NOTE =
  "We couldn’t confirm current prices. Prices will be confirmed when your order is processed.";

const toAmount = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (typeof value !== "string") return NaN;
  const digits = value.replace(/[^\d.]/g, "");
  return digits ? Number(digits) : NaN;
};

const isUnavailableError = (error) =>
  error?.status === 400 && /no longer available|unavailable/i.test(error?.message || "");

export const readQuote = (response, count) => {
  const data = response?.data;
  const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : null;
  if (!items || items.length !== count) return null;

  const flagged = new Set(
    Array.isArray(data?.unavailable) ? data.unavailable.filter(Number.isInteger) : []
  );
  const lines = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (flagged.has(index) || item?.available === false || item?.unavailable === true) {
      lines.push({ available: false });
      continue;
    }
    const price = toAmount(item?.unitPrice ?? item?.price);
    if (!(price > 0)) return null;
    const quantity = toAmount(item?.quantity);
    const lineTotal = toAmount(item?.lineTotal);
    lines.push({
      available: true,
      price,
      lineTotal: lineTotal > 0 ? lineTotal : price * (quantity > 0 ? quantity : 1),
    });
  }

  const total = toAmount(data?.totalAmount ?? data?.total);
  return { lines, total: total > 0 ? total : null };
};

const sumLines = (lines) =>
  lines.reduce((sum, line) => sum + (line.available ? line.lineTotal : 0), 0);

const invalidResponse = () => Object.assign(new Error("Invalid quote response"), { status: 0 });

/** Quotes `items`; on an "unavailable" 400 splits the list to find the lines that can't be priced. */
export const quoteItems = async (items, { signal, budget }) => {
  if (budget.left <= 0) throw new Error("Quote request budget exhausted");
  budget.left -= 1;
  try {
    const response = await apiRequest("/cart/quote", {
      method: "POST",
      body: JSON.stringify({ items }),
      signal,
    });
    const quote = readQuote(response, items.length);
    if (!quote) throw invalidResponse();
    const available = quote.lines.every((line) => line.available);
    return {
      lines: quote.lines,
      total: available && quote.total !== null ? quote.total : sumLines(quote.lines),
    };
  } catch (error) {
    if (!isUnavailableError(error)) throw error;
    if (items.length === 1) return { lines: [{ available: false }], total: 0 };
    const middle = Math.ceil(items.length / 2);
    const first = await quoteItems(items.slice(0, middle), { signal, budget });
    const second = await quoteItems(items.slice(middle), { signal, budget });
    const lines = [...first.lines, ...second.lines];
    return { lines, total: sumLines(lines) };
  }
};

// Fields that affect pricing; the stored price is excluded so applying a quote doesn't re-trigger it.
const quoteSignature = (cart) =>
  JSON.stringify(
    cart.map((item) => {
      const fields = toOrderItem(item);
      delete fields.price;
      return [getCartItemKey(item), fields];
    })
  );

/**
 * useCartQuote({ open, cart }) → { status, lines, total, unavailableKeys, blocked, refresh }
 * - status: "idle" | "loading" | "ok" | "fallback"
 * - lines: { [cartKey]: { available, price, lineTotal } } (only when status is "ok")
 * - blocked: true while quoting or when some lines can't be priced
 */
const useCartQuote = ({ open, cart }) => {
  const dispatch = useDispatch();
  const [state, setState] = useState({ status: "idle", lines: {}, total: null });
  const [nonce, setNonce] = useState(0);
  const cartRef = useRef(cart);
  cartRef.current = cart;

  const signature = useMemo(() => quoteSignature(cart), [cart]);
  const hasItems = cart.length > 0;

  useEffect(() => {
    if (!open || !hasItems) {
      setState({ status: "idle", lines: {}, total: null });
      return undefined;
    }

    const items = cartRef.current;
    const keys = items.map(getCartItemKey);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), QUOTE_TIMEOUT_MS);
    let active = true;

    setState((previous) => ({ ...previous, status: "loading" }));

    quoteItems(items.map(toOrderItem), {
      signal: controller.signal,
      budget: { left: MAX_QUOTE_REQUESTS },
    })
      .then(({ lines, total }) => {
        if (!active) return;
        const byKey = {};
        lines.forEach((line, index) => {
          byKey[keys[index]] = line;
        });
        setState({ status: "ok", lines: byKey, total });
        dispatch(
          applyQuotePrices(
            lines
              .map((line, index) => ({ cartKey: keys[index], price: line.price }))
              .filter((line, index) => lines[index].available)
          )
        );
      })
      .catch(() => {
        if (active) setState({ status: "fallback", lines: {}, total: null });
      })
      .finally(() => clearTimeout(timer));

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, hasItems, signature, nonce, dispatch]);

  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  const unavailableKeys =
    state.status === "ok"
      ? Object.keys(state.lines).filter((key) => state.lines[key]?.available === false)
      : [];

  return {
    ...state,
    unavailableKeys,
    blocked: (open && hasItems && state.status === "idle") || state.status === "loading" || unavailableKeys.length > 0,
    refresh,
  };
};

export default useCartQuote;
