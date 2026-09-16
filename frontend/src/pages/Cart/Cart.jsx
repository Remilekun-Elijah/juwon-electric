import DeleteIcon from "@mui/icons-material/Delete";
import { Container } from "@mui/material";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import {
  clearCart,
  getCartData,
  getCartItemKey,
  getTotal,
} from "../../features/cart";
import config from "../../utils/config";
import CheckoutModal from "../Checkout/Checkout";
import CartItem from "./CartItem";
import EmptyCartUi from "./EmptyCartUi";
import { buttonBase, buttonHover, buttonSmall } from "../../lib/publicStyles";

const Cart = () => {
  const { cart, total } = useSelector(getCartData);
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);

  function emptyCart() {
    dispatch(clearCart());
  }

  useEffect(() => {
    dispatch(getTotal());
  }, [cart, dispatch]);

  return (
    <div>
      <Navbar />
      <div
        className="py-20"
        style={{
          backgroundImage: "url('/contactBackground.svg')",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <Container maxWidth={config.padding.x}>
          <div className="bg-white shadow-lg rounded-lg p-5 md:p-10 mt-12">
            <div className="border-b-2 border-deep_red flex items-center justify-between pb-3 mb-5">
              <p className="text-deep_red sora-bold md:text-2xl text-xl leading-snug">
                Review Your Cart
              </p>

              {cart?.length > 0 && (
                <button
                  onClick={emptyCart}
                  className={`${buttonSmall} border border-black hover:bg-black hover:text-white text-black transition-colors`}
                >
                  <DeleteIcon fontSize="small" />
                  <p>Clear</p>
                </button>
              )}
            </div>

            {cart?.length ? (
              cart?.map((item) => (
                <CartItem key={getCartItemKey(item)} {...{ item }} />
              ))
            ) : (
              <EmptyCartUi />
            )}

            {cart?.length > 0 && (
              <button
                onClick={() => setOpen(true)}
                className={`${buttonBase} ${buttonHover} mt-7 border w-full bg-brand-500 text-white`}
              >
                Proceed
              </button>
            )}
          </div>
        </Container>
      </div>

      <CheckoutModal {...{ open, setOpen, total }} />
      <Footer />
    </div>
  );
};

export default Cart;
