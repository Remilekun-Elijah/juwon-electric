import { configureStore } from "@reduxjs/toolkit";
import carts from "./cart";

export const store = configureStore({
  reducer: {
    carts,
  },
});
