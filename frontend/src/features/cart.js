import { createSlice } from "@reduxjs/toolkit";
// import BACKEND from "../../utils/backend";

// export const getGrades = createAsyncThunk(
//   "/user/getGrade",
//   (search, thunkApi) => {
//     try {
//       const { pagination } = thunkApi.getState().grade;
//       return new BACKEND().send({
//         type: "get",
//         to: `/grades/?pageNumber=${pagination.page}&pageSize=${
//           pagination.pageSize
//         }&search=${search || pagination.search}`,
//         useAlert: false,
//       });
//     } catch (error) {
//       console.error(error);
//     }
//   }
// );

// export const createGrade = createAsyncThunk(
//   "/user/createGrade",
//   (payload, _thunkApi) => {
//     try {
//       return new BACKEND().send({
//         type: "post",
//         to: "/grades/create",
//         payload,
//         useAlert: true,
//       });
//     } catch (error) {
//       console.error(error);
//     }
//   }
// );

const initialState = {
  loading: false,
  cart: localStorage.getItem("je/cart")
    ? JSON.parse(localStorage.getItem("je/cart"))
    : [],
  pagination: {
    page: 1,
    pageSize: 10,
    total: 0,
    length: 0,
    search: "",
  },
  model: {
    name: "",
    gradeNumber: "",
    description: "",
  },
};

export const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    setPagination: (state, { payload }) => {
      state.pagination = { ...state.pagination, ...payload };
    },
    addToCart: (state, { payload }) => {
      console.log(state);
      state.cart = [...state.cart, { ...payload, quantity: 1 }];
      localStorage.setItem("je/cart", JSON.stringify(state.cart));
    },
    removeFromCart: (state, { payload }) => {
      let newCart = state.cart.filter((a) => payload.id !== a.id);
      state.cart = newCart;
      localStorage.setItem("je/cart", JSON.stringify(newCart));
    },
    updateCart: (state, { payload }) => {
      let newCart;
      if (payload.action === "increase") {
        newCart = state.cart.map((a) => {
          if (payload.id === a.id) {
            a.quantity++;
          }
          return a;
        });
      } else if (payload.action === "decrease") {
        newCart = state.cart.map((a) => {
          if (payload.id === a.id) {
            a.quantity--;
          }
          return a;
        });
      } else if (payload.action === "panel") {
        newCart = state.cart.map((a) => {
          if (payload.id === a.id) {
            if (a.withSolar == "true") {
              a.price = a.withoutSolarPrice;
              a.withSolar = "false";
            } else {
              a.price = a.withSolarPrice;
              a.withSolar = "true";
            }
          }
          return a;
        });
      } else alert("invalid action");

      state.cart = newCart;
      localStorage.setItem("je/cart", JSON.stringify(newCart));
    },
    clearCart: (state) => {
      state.cart = [];
      localStorage.setItem("je/cart", JSON.stringify([]));
    },
  },
  extraReducers: () => {
    /** GET GRADE **/
    // builder.
    // addCase(getGrades.pending, (state) => {
    //  state.loading = true;
    // })
    // .addCase(getGrades.fulfilled, (state, {payload}) => {
    //  state.loading = false;
    //  if(payload?.success) {
    //   state.grades = payload?.data?.grades
    //   state.pagination.total = payload?.data?.count;
    //   state.pagination.length = state.pagination.pageSize * state.pagination.page
    //  }
    // })
    // .addCase(getGrades.rejected, state => {
    //   state.loading = false
    // })
    /***CREATE GRADE ***/
    // .addCase(createGrade.pending, (state) => {
    //  state.loading = true;
    // })
    // .addCase(createGrade.fulfilled, (state, {payload}) => {
    //  state.loading = false;
    // })
    // .addCase(createGrade.rejected, state => {
    //   state.loading = false
    // })
  },
});

export const {
  setPagination,
  addToCart,
  updateCart,
  removeFromCart,
  clearCart,
} = cartSlice.actions;
export const getCartData = (state) => state.carts;
export default cartSlice.reducer;
