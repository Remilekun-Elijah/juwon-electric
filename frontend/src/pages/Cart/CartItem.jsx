/* eslint-disable react/prop-types */
import { getAmount } from "../../utils/helper";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import { removeFromCart, updateCart } from "../../features/cart";
import { useDispatch } from "react-redux";
import { Checkbox } from "@mui/material";

const CartItem = ({ item }) => {
  const dispatch = useDispatch();

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
      <p className="md:inter-regular inter-semibold md:text-left text-center text-base md:w-[450px]">
        {item?.kva}kva inverter with {item?.type} battery
      </p>

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
          <div className="md:w-12 inline-flex gap-4 items-center justify-center">
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

        <div className="flex gap-5 md:justify-around justify-between">
          <p className="md:inter-medium inter-semibold text-red ml-2 md:ml-0 md:text-black">
            ₦{getAmount(item?.price * item?.quantity)}
          </p>
          <p className="inter-medium">
            <button
              onClick={RemoveItem}
              className="text-white bg-red md:px-2 px-5 py-1 rounded cursor-pointer"
            >
              Delete{" "}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CartItem;
