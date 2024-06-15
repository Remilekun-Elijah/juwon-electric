import { CircularProgress } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { getUserData, placeOrder } from "../../features/user";
import Alert from "../../utils/Alert";
import { clearCart, getCartData } from "../../features/cart";
import { getAmount } from "../../utils/helper";
import OrderSentModal from "./OrderSentModal";
import CustomModal from "../../components/Modal";
import { useState } from "react";

// eslint-disable-next-line react/prop-types
const Form = ({ setOpen, total }) => {
  const [modal, setModal] = useState(false);
  const { loading } = useSelector(getUserData),
    { cart } = useSelector(getCartData),
    [name, setName] = useState(""),
    dispatch = useDispatch(),
    handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const order = cart.map((a) => {
          const p = {};
          p.kva = `${a.kva}kva ${a.volt ? "+ " + a.volt + "volt" : ""}`.trim();
          p.price = "₦" + getAmount(a.price);
          p.package = `${p.kva} inverter with ${a.package}`;
          p.type = a.type;
          p.quantity = a.quantity;

          return p;
        });

        const payload = {
          name: e.target.name.value,
          phoneNumber: e.target.phoneNumber.value,
          emailAddress: e.target.emailAddress.value,
          deliveryAddress: e.target.deliveryAddress.value,
          order,
          total: "₦" + getAmount(total),
        };

        const emailRegex =
          /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$/gi;

        if (
          payload.emailAddress &&
          emailRegex.test(payload.emailAddress) === false
        ) {
          Alert({ message: "Invalid email address", type: "error" });
          return;
        }
        const res = await dispatch(placeOrder(payload)).unwrap();

        if (res.success) {
          e.target.reset();
          dispatch(clearCart());
          setOpen(false);
          setModal(true);
        }
      } catch (error) {
        console.error(error);
      }
    };

  return (
    <div className="mt-5 flex justify-center">
      <form
        onSubmit={handleSubmit}
        className="order_form gap-5 flex w-full flex-col"
      >
        <p className="inter-regular text-base text-[#0B0B0B] lg:text-left text-center">
          Customer Details
        </p>
        <input
          type="text"
          name="name"
          required
          onChange={(e) => setName(e.target.value)}
          id="name"
          placeholder="Name"
          className="input border-2 bg-transparent p-3 rounded focus:outline-none block"
        />
        <input
          type="tel"
          name="phoneNumber"
          required
          minLength={11}
          maxLength={14}
          id="phoneNumber"
          placeholder="Phone Number"
          className="input border-2 bg-transparent p-3 rounded focus:outline-none block"
        />
        <input
          type="email"
          name="emailAddress"
          id="email"
          // required
          placeholder="Email Address"
          className="input border-2 bg-transparent p-3 rounded focus:outline-none block"
        />

        <textarea
          required
          className="resize-none border-2 bg-transparent p-3 rounded focus:outline-none block"
          placeholder="Delivery Address"
          name="deliveryAddress"
          id="deliveryAddress"
        ></textarea>

        <button
          disabled={loading}
          className="w-full py-2 bg-red text-white mt-5 rounded-lg"
        >
          {loading ? (
            <CircularProgress color="error" sx={{ color: "white" }} size={20} />
          ) : (
            <p>Place Order</p>
          )}
        </button>
      </form>
      <CustomModal
        {...{
          open: modal,
          setOpen: setModal,
          width: "550px",
        }}
      >
        <OrderSentModal {...{ name }} />
      </CustomModal>
    </div>
  );
};

export default Form;
