import { configureStore } from "@reduxjs/toolkit";
import carts from "./cart";
import user from "./user";

export const store = configureStore({
  reducer: {
    carts,
    user,
  },
});
