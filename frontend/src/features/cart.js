import { createSlice } from "@reduxjs/toolkit";
import { LIMITS } from "../utils/validation";

// Package ids (legacy ids) are not unique across package types/names,
// so cart items are identified by a composite key.
export const getCartItemKey = (item) =>
  [item?.type, item?.name, item?.kva, item?.volt ?? "", item?.id].join("|");

export const MAX_CART_ITEMS = LIMITS.cartItems;
export const MIN_QUANTITY = LIMITS.quantityMin;
export const MAX_QUANTITY = LIMITS.quantityMax;

const clampQuantity = (value) => {
  const quantity = Math.trunc(Number(value));
  if (!Number.isFinite(quantity) || quantity < MIN_QUANTITY) return MIN_QUANTITY;
  return Math.min(quantity, MAX_QUANTITY);
};

export const isCartFull = (cart) =>
  Array.isArray(cart) && cart.length >= MAX_CART_ITEMS;

const loadCart = () => {
  try {
    const cart = JSON.parse(localStorage.getItem("je/cart"));
    return Array.isArray(cart)
      ? cart
          .filter((item) => item && typeof item === "object")
          .map((item) => ({ ...item, quantity: clampQuantity(item.quantity) }))
      : [];
  } catch {
    return [];
  }
};

const initialState = {
  cart: loadCart(),
  total: 0,
};

export const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart: (state, { payload }) => {
      // The UI checks isCartFull() first and explains the limit; this is a safety net.
      if (state.cart.length >= MAX_CART_ITEMS) return;
      state.cart = [...state.cart, { ...payload, quantity: 1 }];
      localStorage.setItem("je/cart", JSON.stringify(state.cart));
    },
    removeFromCart: (state, { payload }) => {
      const newCart = state.cart.filter(
        (a) => payload.cartKey !== getCartItemKey(a)
      );
      state.cart = newCart;
      localStorage.setItem("je/cart", JSON.stringify(newCart));
    },
    updateCart: (state, { payload }) => {
      let newCart;
      if (payload.action === "increase") {
        newCart = state.cart.map((a) => {
          if (
            payload.cartKey === getCartItemKey(a) &&
            a.quantity < MAX_QUANTITY
          ) {
            a.quantity++;
          }
          return a;
        });
      } else if (payload.action === "decrease") {
        newCart = state.cart.map((a) => {
          if (
            payload.cartKey === getCartItemKey(a) &&
            a.quantity > MIN_QUANTITY
          ) {
            a.quantity--;
          }
          return a;
        });
      } else if (payload.action === "panel") {
        newCart = state.cart.map((a) => {
          if (payload.cartKey === getCartItemKey(a)) {
            if (a.withSolar === "true") {
              a.price = a.withoutSolarPrice;
              a.withSolar = "false";
            } else {
              a.price = a.withSolarPrice;
              a.withSolar = "true";
            }
          }
          return a;
        });
      } else return;

      state.cart = newCart;
      localStorage.setItem("je/cart", JSON.stringify(newCart));
    },
    // Replaces stored prices with the server's quote: payload [{ cartKey, price }].
    applyQuotePrices: (state, { payload }) => {
      const prices = new Map(
        (Array.isArray(payload) ? payload : [])
          .filter((line) => Number.isFinite(line?.price) && line.price > 0)
          .map((line) => [line.cartKey, line.price])
      );
      let changed = false;
      state.cart.forEach((item) => {
        const price = prices.get(getCartItemKey(item));
        if (price === undefined || Number(item.price) === price) return;
        item.price = price;
        if (item.withSolar === "true" || item.withSolar === true) {
          item.withSolarPrice = price;
        } else {
          item.withoutSolarPrice = price;
        }
        changed = true;
      });
      if (changed) localStorage.setItem("je/cart", JSON.stringify(state.cart));
    },
    clearCart: (state) => {
      state.cart = [];
      localStorage.setItem("je/cart", JSON.stringify([]));
    },
    getTotal: (state) => {
      const amount = state?.cart?.map((a) => a?.price * a?.quantity);

      const total = amount.length && amount?.reduce((a, b) => b + a, 0);
      state.total = total;
    },
  },
});

export const {
  addToCart,
  updateCart,
  removeFromCart,
  applyQuotePrices,
  clearCart,
  getTotal,
} = cartSlice.actions;
export const getCartData = (state) => state.carts;
export default cartSlice.reducer;
