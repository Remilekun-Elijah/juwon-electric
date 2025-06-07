/* eslint-disable react/prop-types */
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { Checkbox } from "@mui/material";
import { useState } from "react";
import { useDispatch } from "react-redux";
import CustomModal from "../../components/Modal";
import { removeFromCart, updateCart } from "../../features/cart";
import { getAmount } from "../../utils/helper";

const CartItem = ({ item }) => {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);

  function updateQuantity(type) {
    dispatch(updateCart({ action: type, id: item.id }));
  }
  function RemoveItem() {
    dispatch(removeFromCart({ id: item.id }));
  }

  return (
    <div className="shadow rounded flex md:flex-row flex-col gap-4 justify-between items-center mt-5 py-3 px-4">
      <img
        src="/cartImage.svg"
        className="p-1 rounded-md md:shadow md:w-fit w-[50%]"
        alt="product"
      />
      <div>
        <p className="md:inter-regular inter-semibold md:text-left text-center text-base md:w-[450px] pb-0 mb-0">
          {item?.type?.toLowerCase() === "hybrid lithium"
            ? `${item?.kva}kva hybrid inverter with lithium battery`
            : `${item?.kva}kva inverter with ${item?.type} battery`}
        </p>
        <small
          className={`text-bold 
            ${
              ["platinum", "premium"].includes(item.name.toLowerCase())
                ? "text-[#e26767]"
                : item.name.toLowerCase() === "gold"
                ? "text-[var(--gold)]"
                : item.name.toLowerCase() === "diamond"
                ? "text-[var(--diamond)]"
                : "text-gray-500"
            }
          }]`}
        >
          - {item?.name} package
        </small>
      </div>

      <div className="fle grid lg:grid-cols-2 gap-5 w-full px-2">
        <div className="flex md:justify-around justify-between w-full">
          {" "}
          <div className="inter-regular text-base flex items-center">
            <Checkbox
              checked={item?.withSolar == "true"}
              onChange={() => updateQuantity("panel")}
              sx={{
                ml: 0,
                color: "#DB464C",
                "&.Mui-checked": {
                  color: "#DB464C",
                },
              }}
            />
            <p className="md:inter-regular inter-regular text-base">
              With solar
            </p>
          </div>
          <div className="md:w-12 inline-flex gap-4 items-center justify-center items-center">
            <button
              disabled={item?.quantity === 1}
              onClick={() => updateQuantity("decrease")}
              className="disabled:!cursor-not-allowed h-5 w-6 justify-center flex items-center !p-0  shadow disabled:bg-[#eee] disabled:border-red disabled:border- disabled:text-red bg-red text-white rounded"
            >
              <RemoveIcon className="!p-0 !m-0 !w-5" />
            </button>
            <p className="text-red drop-shadow-xl text-lg">{item?.quantity}</p>
            <button
              onClick={() => updateQuantity("increase")}
              className="h-5 w-6 justify-center flex items-center !p-0 shadow bg-red text-white rounded"
            >
              <AddIcon className="!w-5" />
            </button>
          </div>
        </div>

        <div className="flex gap-5 md:justify-around justify-between items-center">
          <p className="md:inter-medium inter-semibold text-red ml-2 md:ml-0 md:text-black">
            ₦{getAmount(item?.price * item?.quantity)}
          </p>
          <p className="inter-medium">
            <button
              onClick={() => setOpen(true)}
              className="text-white bg-red md:px-2 px-5 py-1 rounded cursor-pointer"
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
            <div className="flex nd:justify-between md:gap-10 gap-3 mb-5 flex-wrap justify-center">
              <button
                onClick={() => setOpen(false)}
                className="border-2 border-red text-red rounded-lg py-2 px-5"
              >
                Cancel
              </button>
              <button
                onClick={RemoveItem}
                className="border-0 text-white bg-red rounded-lg py-2 px-5"
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
