/* eslint-disable react-hooks/exhaustive-deps */
import DeleteIcon from "@mui/icons-material/Delete";
import { Container } from "@mui/material";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import { clearCart, getCartData, getTotal } from "../../features/cart";
import config from "../../utils/config";
import CheckoutModal from "../Checkout/Checkout";
import CartItem from "./CartItem";
import EmptyCartUi from "./EmptyCartUi";

const Cart = () => {
  const { cart, total } = useSelector(getCartData);
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);

  function emptyCart() {
    dispatch(clearCart());
  }

  useEffect(() => {
    dispatch(getTotal());
  }, [cart]);

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
              <p className="text-deep_red sora-bold md:text-2xl text-xl">
                Review Your Cart
              </p>

              {cart?.length > 0 && (
                <button
                  onClick={emptyCart}
                  className="border rounded border-black hover:bg-black hover:text-white text-black flex items-center gap-2 md:py- py-1 px-3 sora-regular text-lg"
                >
                  <DeleteIcon />
                  <p>Clear</p>
                </button>
              )}
            </div>

            {cart?.length ? (
              cart?.map((item, i) => <CartItem key={i} {...{ item }} />)
            ) : (
              <EmptyCartUi />
            )}

            {cart?.length > 0 && (
              <button
                onClick={() => setOpen(true)}
                className="mt-7 border rounded w-full bg-red text-white flex items-center justify-center text-center py-2 px-5 sora-regular text-lg"
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
