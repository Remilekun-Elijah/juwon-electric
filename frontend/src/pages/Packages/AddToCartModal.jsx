/* eslint-disable react/prop-types */
import { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Alert from "../../utils/Alert";
import CustomModal from "../../components/Modal";
import {
  MAX_CART_ITEMS,
  addToCart,
  getCartData,
  isCartFull,
} from "../../features/cart";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { Radio } from "@mui/material";
import { buttonBase, buttonHover } from "../../lib/publicStyles";

const AddToCartModal = ({ open, setOpen, product, setProduct }) => {
  const dispatch = useDispatch();
  const { cart } = useSelector(getCartData);
  const [withSolar, setWithSolar] = useState(null);
  const solarRef = useRef();

  function addProductToCart() {
    if (!product) return;
    if (isCartFull(cart)) {
      Alert({
        message: `Your cart can hold up to ${MAX_CART_ITEMS} items. Place your order or remove an item to add more.`,
        type: "error",
      });
      return;
    }
    Alert({ message: "Package added to cart" });

    const withSolarPrice = product?.options?.[1]?.price;
    const withoutSolarPrice = product?.options?.[0]?.price;

    dispatch(
      addToCart({
        ...product,
        withSolarPrice,
        withoutSolarPrice,
        price: withSolar === "true" ? withSolarPrice : withoutSolarPrice,
        package:
          withSolar === "true"
            ? product?.options?.[1]?.kits
            : product?.options?.[0]?.kits,
        withSolar,
      })
    );
    setWithSolar(null);
    setProduct(null);
    solarRef.current?.reset?.();
    setOpen(false);
  }

  const controlProps = (item) => {
    return {
      checked: withSolar === String(item),
      onChange: handleChange,
      value: item,
      name: "withSolar",
      inputProps: { "aria-label": item },
    };
  };
  const handleChange = (event) => {
    setWithSolar(event.target.value);
  };

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
          <p className="inter-bold text-lg">Add To Cart</p>
        </div>
      }
    >
      <div className="px-4">
        <p className="inter-regular text-base text-[#0B0B0B]">
          Packages Options
        </p>

        <div className="mt-4 border-2 rounded-lg border-dashed py-3">
          <form ref={solarRef} className="mx-3">
            <div className="flex items-center justify-between min-h-[48px] md:mb-3 mb-2">
              <label
                htmlFor="withSolar"
                className="cursor-pointer inter-regular text-base flex-1 py-2"
              >
                With Solar
              </label>

              <Radio
                id="withSolar"
                {...controlProps(true)}
                sx={{
                  color: "#DB464C",
                  "&.Mui-checked": {
                    color: "#DB464C",
                  },
                }}
              />
            </div>
            <div className="flex items-center justify-between min-h-[48px]">
              <label
                htmlFor="withoutSolar"
                className="cursor-pointer inter-regular text-base flex-1 py-2"
              >
                Without Solar
              </label>

              <Radio
                id="withoutSolar"
                {...controlProps(false)}
                sx={{
                  color: "#DB464C",
                  "&.Mui-checked": {
                    color: "#DB464C",
                  },
                }}
              />
            </div>
          </form>
        </div>

        <button
          disabled={withSolar === null}
          onClick={addProductToCart}
          className={`${buttonBase} ${buttonHover} w-full bg-brand-500 text-white mt-5`}
        >
          Continue
        </button>
      </div>
    </CustomModal>
  );
};

export default AddToCartModal;
