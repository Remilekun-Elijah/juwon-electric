import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import BACKEND from "../utils/backend";

export const subscribe = createAsyncThunk("/user/subscribe", (payload) => {
  try {
    // const { pagination } = thunkApi.getState().grade;
    return new BACKEND().send({
      type: "post",
      to: "/subscribe",
      useAlert: true,
      payload,
    });
  } catch (error) {
    console.error(error);
  }
});

export const sendMessage = createAsyncThunk("/user/sendMessage", (payload) => {
  try {
    return new BACKEND().send({
      type: "post",
      to: "/contact",
      payload,
      useAlert: true,
    });
  } catch (error) {
    console.error(error);
  }
});
export const placeOrder = createAsyncThunk("/user/placeOrder", (payload) => {
  try {
    return new BACKEND().send({
      type: "post",
      to: "/order",
      payload,
      useAlert: false,
    });
  } catch (error) {
    console.error(error);
  }
});

const initialState = {
  loading: false,
  model: {
    name: "",
    gradeNumber: "",
    description: "",
  },
};

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setPagination: (state, { payload }) => {
      state.pagination = { ...state.pagination, ...payload };
    },
  },
  extraReducers: (builder) => {
    /** GET GRADE **/
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

export const { setPagination } = userSlice.actions;
export const getUserData = (state) => state.user;
export default userSlice.reducer;
