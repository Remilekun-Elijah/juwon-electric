/* eslint-disable react/prop-types */
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import CustomModal from "../../components/Modal";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import {
  getCartData,
  getCartItemKey,
  removeFromCart,
} from "../../features/cart";
import { getAmount } from "../../utils/helper";
import Form from "./Form";
import { cartItemLabel } from "./orderItems";
import useCartQuote, { QUOTE_FALLBACK_NOTE } from "./useCartQuote";
import { buttonHover, buttonSmall } from "../../lib/publicStyles";

const CheckoutModal = ({ open, setOpen, total }) => {
  const { cart } = useSelector(getCartData);
  const dispatch = useDispatch();
  const quote = useCartQuote({ open, cart });
  const quoted = quote.status === "ok";
  const displayTotal = quoted ? quote.total : total;

  // Nothing left to order (e.g. every unavailable line was removed).
  useEffect(() => {
    if (open && cart.length === 0) setOpen(false);
  }, [open, cart.length, setOpen]);

  return (
    <CustomModal
      {...{
        open,
        setOpen,
        width: "550px",
      }}
      title={
        <div className="flex items-center gap-3">
          <ShoppingCartIcon />
          <p className="inter-bold text-lg">Check Out</p>
        </div>
      }
    >
      <div className="px-4">
        <p className="inter-regular text-left text-base text-[#0B0B0B]">
          Order Summary
        </p>

        <div className="mt-4 border-2 rounded-lg border-dashed py-4">
          <div className="mx-3">
            {cart.map((item) => {
              const cartKey = getCartItemKey(item);
              const line = quoted ? quote.lines[cartKey] : undefined;
              const unavailable = line?.available === false;
              const amount = line?.available
                ? line.lineTotal
                : item?.price * item?.quantity;

              if (unavailable) {
                return (
                  <div key={cartKey} className="mt-2">
                    <p className="inter-regular text-base text-[#878787]">
                      {cartItemLabel(item)} × {item?.quantity}
                    </p>
                    <div className="flex items-center justify-between gap-3 mt-1">
                      <span className="block inter-medium text-deep_red">
                        Unavailable
                      </span>
                      <button
                        type="button"
                        onClick={() => dispatch(removeFromCart({ cartKey }))}
                        className={`${buttonSmall} ${buttonHover} text-white bg-brand-500 cursor-pointer`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={cartKey} className="flex items-baseline justify-between gap-2 mt-2">
                  <p className="inter-regular text-base text-[#878787]">
                    {cartItemLabel(item)} × {item?.quantity}
                  </p>
                  <span className="block inter-medium text-[#191A15] shrink-0">
                    ₦{getAmount(amount)}
                  </span>
                </div>
              );
            })}

            <div className="flex items-baseline justify-between gap-2 mt-2">
              <p className="cursor-pointer inter-regular text-base text-[#878787]">
                Sub total
              </p>

              <span className="block inter-medium text-[#191A15]">
                ₦{getAmount(displayTotal)}
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-2 my-2">
              <p className="inter-regular text-base text-[#878787]">Discount</p>
              <span className="block inter-medium text-[#191A15]">₦0.00</span>
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <p className="inter-regular text-base text-[#878787]">
                Delivery within Lagos
              </p>
              <span className="block text-brand-500 inter-medium text-base">
                FREE
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2 mt-3 mb-2">
              <p className="inter-bold text-base text-[#878787]">Total</p>
              <span className="block text-[#191A15] inter-bold text-xl">
                ₦{getAmount(displayTotal)}
              </span>
            </div>

            {quote.status === "loading" && (
              <p className="inter-regular text-sm text-[#878787]">
                Checking current prices…
              </p>
            )}
            {quote.status === "fallback" && (
              <p className="inter-regular text-sm text-[#878787]">
                {QUOTE_FALLBACK_NOTE}
              </p>
            )}
            {quote.unavailableKeys.length > 0 && (
              <p role="alert" className="inter-regular text-sm text-deep_red">
                Some items are no longer available. Remove them to place your
                order.
              </p>
            )}
          </div>
        </div>
        <Form {...{ setOpen, total: displayTotal, quote }} />
      </div>
    </CustomModal>
  );
};

export default CheckoutModal;
