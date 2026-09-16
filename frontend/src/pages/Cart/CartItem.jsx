/* eslint-disable react/prop-types */
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { Checkbox } from "@mui/material";
import { useState } from "react";
import { useDispatch } from "react-redux";
import CustomModal from "../../components/Modal";
import {
  MAX_QUANTITY,
  getCartItemKey,
  removeFromCart,
  updateCart,
} from "../../features/cart";
import { getAmount } from "../../utils/helper";
import { buttonHover, buttonSmall } from "../../lib/publicStyles";

// Quantity stepper button: 32px square (was 20x24), same look in both states.
const stepButton =
  "disabled:!cursor-not-allowed h-8 w-8 shrink-0 justify-center flex items-center !p-0 shadow rounded-md transition-opacity duration-150";

const CartItem = ({ item }) => {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);

  function updateQuantity(type) {
    dispatch(updateCart({ action: type, cartKey: getCartItemKey(item) }));
  }
  function removeItem() {
    dispatch(removeFromCart({ cartKey: getCartItemKey(item) }));
  }

  return (
    <div className="shadow rounded-lg flex md:flex-row flex-col gap-4 justify-between items-center mt-5 py-3 px-4">
      <img
        src="/cartImage.svg"
        width={74}
        height={74}
        className="p-1 rounded-md md:shadow md:w-fit w-[50%] md:shrink-0"
        alt="product"
      />
      {/* 450px preferred width, but allowed to shrink so the row never overflows (768/1024). */}
      <div className="md:basis-[450px] md:shrink md:min-w-0">
        <p className="inter-semibold md:text-left text-center text-base leading-snug pb-0 mb-0">
          {item?.type?.toLowerCase() === "hybrid lithium"
            ? `${item?.kva}kva hybrid inverter + lithium battery`
            : `${item?.kva}kva inverter with ${item?.type} battery`}
        </p>
        <small
          className={
            ["platinum", "premium"].includes(item.name.toLowerCase())
              ? "text-[#e26767]"
              : item.name.toLowerCase() === "gold"
                ? "text-[var(--gold)]"
                : item.name.toLowerCase() === "diamond"
                  ? "text-[var(--diamond)]"
                  : "text-gray-500"
          }
        >
          - {item?.name} package
        </small>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 w-full md:flex-1 lg:min-w-[460px] px-2">
        <div className="flex md:justify-around justify-between gap-3 w-full">
          {" "}
          <div className="inter-regular text-base flex items-center">
            <Checkbox
              checked={item?.withSolar === "true"}
              onChange={() => updateQuantity("panel")}
              sx={{
                ml: 0,
                color: "#DB464C",
                "&.Mui-checked": {
                  color: "#DB464C",
                },
              }}
            />
            <p className="inter-regular text-base whitespace-nowrap">
              With solar
            </p>
          </div>
          <div className="inline-flex gap-3 items-center justify-center">
            <button
              disabled={item?.quantity === 1}
              onClick={() => updateQuantity("decrease")}
              className={`${stepButton} disabled:bg-[#eee] disabled:border-brand-500 disabled:text-brand-500 bg-brand-500 text-white`}
            >
              <RemoveIcon className="!p-0 !m-0 !w-5" />
            </button>
            <p className="text-brand-500 drop-shadow-xl text-lg min-w-[1.5rem] text-center">{item?.quantity}</p>
            <button
              disabled={item?.quantity >= MAX_QUANTITY}
              title={
                item?.quantity >= MAX_QUANTITY
                  ? `You can order up to ${MAX_QUANTITY} of each package.`
                  : undefined
              }
              onClick={() => updateQuantity("increase")}
              className={`${stepButton} disabled:bg-[#eee] disabled:text-brand-500 bg-brand-500 text-white`}
            >
              <AddIcon className="!w-5" />
            </button>
          </div>
        </div>

        <div className="flex gap-5 md:justify-around justify-between items-center">
          <p className="inter-semibold text-brand-500 ml-2 md:ml-0 md:text-black md:min-w-[7.5rem] md:text-center whitespace-nowrap">
            ₦{getAmount(item?.price * item?.quantity)}
          </p>
          <p className="inter-medium">
            <button
              onClick={() => setOpen(true)}
              className={`${buttonSmall} ${buttonHover} text-white bg-brand-500 cursor-pointer`}
            >
              Remove{" "}
            </button>
          </p>
        </div>
      </div>

      <CustomModal
        {...{
          open,
          setOpen,
          width: "550px",
        }}
        title={
          <div className="flex items-center gap-3">
            <ShoppingCartIcon />
            <p className="inter-bold text-lg">Remove item</p>
          </div>
        }
      >
        <div className="flex justify-center items-center px-5">
          <div className="flex flex-col justify-center items-center">
            <p className="block inter-regular text-base mb-5 text-center md:px-3">
              {" "}
              Are you sure you want to remove this item?
            </p>
            <div className="flex md:gap-10 gap-3 mb-5 flex-wrap justify-center">
              <button
                onClick={() => setOpen(false)}
                className="min-h-[44px] border-2 border-brand-500 text-brand-500 rounded-lg py-2 px-5"
              >
                Cancel
              </button>
              <button
                onClick={removeItem}
                className="min-h-[44px] border-0 text-white bg-brand-500 rounded-lg py-2 px-5 transition-opacity duration-150 hover:opacity-90"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </CustomModal>
    </div>
  );
};

export default CartItem;
