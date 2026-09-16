/* eslint-disable react/prop-types */
import { CircularProgress } from "@mui/material";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import CustomModal from "../../components/Modal";
import { clearCart, getCartData } from "../../features/cart";
import { getUserData, placeOrder } from "../../features/user";
import Alert from "../../utils/Alert";
import { getAmount } from "../../utils/helper";
import OrderSentModal from "./OrderSentModal";
import { toOrderItem } from "./orderItems";
import TurnstileWidget from "../../components/TurnstileWidget";
import useTurnstile from "../../utils/useTurnstile";
import {
  LIMITS,
  PHONE_MESSAGE,
  PHONE_PATTERN,
  isValidEmail,
  isValidPhone,
} from "../../utils/validation";
import { buttonBase, buttonHover, fieldBase } from "../../lib/publicStyles";

/** The order total the server computed, as display text ("₦1,150,000"), or "" if absent. */
const readOrderTotal = (order) => {
  if (typeof order?.total === "string" && order.total.trim()) return order.total.trim();
  const amount = Number(order?.totalAmount ?? order?.total);
  return Number.isFinite(amount) && amount > 0 ? "₦" + getAmount(amount) : "";
};

const Form = ({ setOpen, total, quote }) => {
  const [modal, setModal] = useState(false);
  const [orderTotal, setOrderTotal] = useState("");
  const { loading } = useSelector(getUserData),
    { cart } = useSelector(getCartData),
    [name, setName] = useState(""),
    turnstile = useTurnstile({ action: "order" }),
    dispatch = useDispatch(),
    handleSubmit = async (e) => {
      e.preventDefault();
      try {
        if (cart.length > LIMITS.cartItems) {
          Alert({
            message: `An order can include up to ${LIMITS.cartItems} items. Remove some items and try again.`,
            type: "error",
          });
          return;
        }

        if (quote?.unavailableKeys?.length) {
          Alert({
            message: "Some items are no longer available. Remove them to place your order.",
            type: "error",
          });
          return;
        }
        if (quote?.blocked) {
          Alert({
            message: "We’re still checking current prices. Please try again in a moment.",
            type: "error",
          });
          return;
        }

        const order = cart.map(toOrderItem);

        const payload = {
          name: e.target.name.value,
          phoneNumber: e.target.phoneNumber.value,
          emailAddress: e.target.emailAddress.value,
          deliveryAddress: e.target.deliveryAddress.value,
          order,
          total: "₦" + getAmount(total),
        };

        if (payload.emailAddress && !isValidEmail(payload.emailAddress)) {
          Alert({ message: "Invalid email address", type: "error" });
          return;
        }

        if (!isValidPhone(payload.phoneNumber)) {
          Alert({ message: PHONE_MESSAGE, type: "error" });
          return;
        }

        if (!turnstile.ready) {
          Alert({
            message: "Please complete the security check and try again.",
            type: "error",
          });
          return;
        }

        const form = e.target;
        try {
          const res = await dispatch(
            placeOrder(turnstile.withToken(payload))
          ).unwrap();

          if (res?.success) {
            setOrderTotal(readOrderTotal(res?.data));
            form.reset();
            dispatch(clearCart());
            setOpen(false);
            setModal(true);
          } else {
            // Prices or availability may have changed since the quote.
            quote?.refresh?.();
          }
        } finally {
          turnstile.reset();
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
          maxLength={LIMITS.personName}
          placeholder="Name"
          className={`input ${fieldBase} bg-transparent`}
        />
        <input
          type="tel"
          name="phoneNumber"
          required
          maxLength={LIMITS.phoneNumber}
          pattern={PHONE_PATTERN}
          title={PHONE_MESSAGE}
          id="phoneNumber"
          placeholder="Phone Number"
          className={`input ${fieldBase} bg-transparent`}
        />
        <input
          type="email"
          name="emailAddress"
          id="email"
          maxLength={LIMITS.email}
          placeholder="Email Address"
          className={`input ${fieldBase} bg-transparent`}
        />

        <textarea
          required
          className={`resize-none ${fieldBase} bg-transparent`}
          placeholder="Delivery Address"
          name="deliveryAddress"
          id="deliveryAddress"
          maxLength={LIMITS.deliveryAddress}
        ></textarea>

        <div className="flex flex-col">
          <TurnstileWidget
            turnstile={turnstile}
            errorClassName="text-sm text-deep_red"
          />
          <button
            disabled={loading || !turnstile.ready || Boolean(quote?.blocked)}
            className={`${buttonBase} ${buttonHover} w-full bg-brand-500 text-white mt-5`}
          >
            {loading ? (
              <CircularProgress color="error" sx={{ color: "white" }} size={20} />
            ) : (
              <p>Place Order</p>
            )}
          </button>
        </div>
      </form>
      <CustomModal
        {...{
          open: modal,
          setOpen: setModal,
          width: "550px",
        }}
      >
        <OrderSentModal {...{ name, total: orderTotal }} />
      </CustomModal>
    </div>
  );
};

export default Form;
