/* eslint-disable react/prop-types */
import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import Alert from "../../utils/Alert";
import CustomModal from "../../components/Modal";
import {} from "react-redux";
import { addToCart } from "../../features/cart";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { Radio } from "@mui/material";

// eslint-disable-next-line react/prop-types
const AddToCartModal = ({ open, setOpen, product, setProduct }) => {
  const dispatch = useDispatch();
  const [withSolar, setWithSolar] = useState(null);
  const solarRef = useRef();

  function addProductToCart() {
    Alert({ message: "Package added to cart" });

    product.withSolarPrice = product?.options[1].price;
    product.withoutSolarPrice = product?.options[0].price;

    product.price =
      withSolar == "true" ? product.withSolarPrice : product.withoutSolarPrice;
    product.package =
      withSolar == "true"
        ? product?.options?.[1]?.kits
        : product?.options?.[0]?.kits;

    dispatch(addToCart({ ...product, withSolar }));
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
    // alert(event.target.value);
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

        <div className="mt-5 border-2 rounded-lg border-dashed py-5">
          <form ref={solarRef} className="mx-3">
            <div className="flex justify-between md:mb-7 mb-5">
              <label
                htmlFor="withSolar"
                className="cursor-pointer inter-regular text-base"
              >
                With Solar
              </label>

              <Radio
                id="withSolar"
                {...controlProps(false)}
                sx={{
                  color: "#DB464C",
                  "&.Mui-checked": {
                    color: "#DB464C",
                  },
                }}
              />
            </div>
            <div className="flex justify-between">
              <label
                htmlFor="withoutSolar"
                className="cursor-pointer inter-regular text-base"
              >
                Without Solar
              </label>

              <Radio
                id="withoutSolar"
                {...controlProps(true)}
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
          className="w-full py-2 bg-red text-white my-5 rounded-lg"
        >
          Continue
        </button>
      </div>
    </CustomModal>
  );
};

export default AddToCartModal;
