import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import BACKEND from "../utils/backend";

export const subscribe = createAsyncThunk("/user/subscribe", (payload) =>
  new BACKEND().send({
    type: "post",
    to: "/subscribe",
    useAlert: true,
    payload,
  })
);

export const sendMessage = createAsyncThunk("/user/sendMessage", (payload) =>
  new BACKEND().send({
    type: "post",
    to: "/contact",
    payload,
    useAlert: true,
  })
);

export const placeOrder = createAsyncThunk("/user/placeOrder", (payload) =>
  new BACKEND().send({
    type: "post",
    to: "/order",
    payload,
    useAlert: false,
  })
);

const initialState = {
  loading: false,
};

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(subscribe.pending, (state) => {
        state.loading = true;
      })
      .addCase(subscribe.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(subscribe.rejected, (state) => {
        state.loading = false;
      })
      .addCase(sendMessage.pending, (state) => {
        state.loading = true;
      })
      .addCase(sendMessage.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(sendMessage.rejected, (state) => {
        state.loading = false;
      })
      .addCase(placeOrder.pending, (state) => {
        state.loading = true;
      })
      .addCase(placeOrder.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(placeOrder.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const getUserData = (state) => state.user;
export default userSlice.reducer;
