import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { Container } from "@mui/material";
import config from "../../utils/config";
import DeleteIcon from "@mui/icons-material/Delete";
import { useDispatch, useSelector } from "react-redux";
import { clearCart, getCartData } from "../../features/cart";
import CartItem from "./CartItem";
import { useEffect } from "react";
import EmptyCartUi from "./EmptyCartUi";

const Cart = () => {
  const { cart } = useSelector(getCartData);
  const dispatch = useDispatch();

  useEffect(() => console.log(cart), []);
  function emptyCart() {
    dispatch(clearCart());
  }
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
          <div className="bg-offWhite shadow-lg rounded-lg p-5 md:p-10 mt-12">
            <div className="border-b-2 border-deep_red flex items-center justify-between pb-3 mb-5">
              <p className="text-deep_red sora-bold md:text-2xl text-xl">
                Review Your Cart
              </p>

              <button
                onClick={emptyCart}
                className="border rounded border-deep_red hover:bg-deep_red hover:text-white text-deep_red flex items-center mb- gap- py-2 px-5 sora-regular text-lg"
              >
                <DeleteIcon />
                <p>Clear</p>
              </button>
            </div>

            {cart.length ? (
              cart.map((item, i) => <CartItem key={i} {...{ item }} />)
            ) : (
              <EmptyCartUi />
            )}

            <button
              // to={config.routes.packages}
              className="mt-7 border rounded w-full bg-red text-white flex items-center justify-center text-center py-2 px-5 sora-regular text-lg"
            >
              Proceed
            </button>
          </div>
        </Container>
      </div>

      <Footer />
    </div>
  );
};

export default Cart;
