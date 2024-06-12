/* eslint-disable react/prop-types */
import { useRef, useState } from "react";
import Alert from "../../utils/Alert";
import CustomModal from "../../components/Modal";
import {} from "react-redux";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { getAmount } from "../../utils/helper";
import Form from "./Form";

// eslint-disable-next-line react/prop-types
const CheckoutModal = ({ open, setOpen, total }) => {
  const [withSolar, setWithSolar] = useState(null);
  const solarRef = useRef();

  function addProductToCart() {
    Alert({ message: "Package added to cart" });
  }

  // const handleChange = (event) => {
  //   setWithSolar(event.target.value);
  // };

  return (
    <CustomModal
      {...{
        open,
        setOpen: (v) => {
          setOpen(v);
          setWithSolar(null);
          solarRef.current?.reset?.();
        },
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

        <div className="mt-5 border-2 rounded-lg border-dashed py-5">
          <form ref={solarRef} className="mx-3">
            <div className="flex justify-between mt-2">
              <p className="cursor-pointer inter-regular text-base text-[#878787]">
                Sub total
              </p>

              <span className="block inter-medium text-[#191A15]">
                ₦{getAmount(total)}
              </span>
            </div>

            <div className="flex justify-between my-2">
              <p className="inter-regular text-base text-[#878787]">Discount</p>
              <span className="block inter-medium text-[#191A15]">₦0.00</span>
            </div>

            <div className="flex justify-between">
              <p className="inter-regular text-base text-[#878787]">
                Delivery within Lagos
              </p>
              <span className="block text-red inter-medium text-base">
                FREE
              </span>
            </div>
            <div className="flex justify-between my-2">
              <p className="inter-bold text-base text-[#878787]">Total</p>
              <span className="block text-[#191A15] inter-bold text-xl">
                ₦{getAmount(total)}
              </span>
            </div>
          </form>
        </div>
        <Form />
        <button
          // onClick={addProductToCart}
          className="w-full py-2 bg-red text-white mt-5 rounded-lg"
        >
          Place Order
        </button>
      </div>
    </CustomModal>
  );
};

export default CheckoutModal;
