// import React from "react";
import CheckIcon from "@mui/icons-material/Check";
import { getAmount } from "../../utils/helper";

const DisplayProduct = ({ products, setOpen, setProduct, cart }) => {
  function openModal(product) {
    setProduct(product);
    setOpen(true);
  }

  return products.map((a, i) => {
    const f = cart.find((c) => {
      if (c.type === a.type && c.kva === a.kva && c.id === a.id) {
        return c;
      }
    });

    const inCart = a?.id === f?.id,
      lithiumPlatinum = a.name === "Platinum",
      lithiumDiamond = a.name === "Diamond",
      tubularPremium = a.name === "Premium";

    const diamondGradient = (dir) => {
      return dir === "b"
        ? `bg-gradient-to-${dir} from-[#ff6961] to-[#ff9f00]`
        : `bg-gradient-to-${dir} from-[#ff9f00] to-[#ff6961]`;
    };

    return (
      <div
        key={i}
        className={`shadow rounded-xl py-5 md:px-3 px-5 ${
          lithiumPlatinum || tubularPremium
            ? "bg-gradient-to-b to-pink-400 from-red"
            : lithiumDiamond
            ? diamondGradient("b")
            : "bg-white"
        }`}
      >
        <h4
          className={`sora-semibold text-2xl mb-5 mt-2 text-center ${
            lithiumPlatinum || tubularPremium || lithiumDiamond
              ? "text-white"
              : "text-black"
          }`}
        >
          {a.name}
        </h4>

        <p
          className={`inter-medium md:text-base text-sm text-center mb-5 
                      ${
                        lithiumPlatinum || tubularPremium || lithiumDiamond
                          ? "text-white"
                          : "md:text-[#EDA4A6] text-[#e26767]"
                      }`}
        >
          {a.load}
        </p>

        <p className="text-center flex justify-center gap-2 mb-3 items-center">
          <span className="inline-flex">
            <strong
              className={`md:text-[50px] text-4xl drop-shadow-md p-0 m-0 inter-semibold ${
                lithiumPlatinum || tubularPremium || lithiumDiamond
                  ? "text-white"
                  : "text-black"
              }`}
            >
              {a.kva}
            </strong>
            <sup
              className={` ${
                lithiumPlatinum || tubularPremium || lithiumDiamond
                  ? "text-white"
                  : "text-[#EDA4A6]"
              } drop-shadow-md text-lg p-0 mt-2 ml-1 inter-medium`}
            >
              kva
            </sup>
          </span>
          {a.volt && (
            <span className="inline-flex">
              <strong
                className={`md:text-[50px] ${
                  lithiumPlatinum || tubularPremium || lithiumDiamond
                    ? "text-white"
                    : "text-black"
                } text-4xl drop-shadow-md p-0 m-0 inter-semibold`}
              >
                {a.volt}
              </strong>
              <sup
                className={` ${
                  lithiumPlatinum || tubularPremium || lithiumDiamond
                    ? "text-white"
                    : "text-[#EDA4A6]"
                } drop-shadow-md text-lg p-0 mt-2 ml-1 inter-medium`}
              >
                v
              </sup>
            </span>
          )}
        </p>

        <div
          className={`
          ${
            lithiumPlatinum || tubularPremium || lithiumDiamond
              ? "bg-white"
              : "bg-[#F9FAFB]"
          } rounded-xl px-5 py-7`}
        >
          {a.options.map((b, i) => (
            <div key={i} className="flex gap-3 mb-5">
              <CheckIcon
                className={`p-1 ${
                  lithiumDiamond ? "bg-[var(--diamond)]" : "bg-red"
                } text-white rounded-full`}
              />
              <div>
                <p className="inter-medium md:text-base text-sm">
                  {b.name},{" "}
                  <span
                    className={`${
                      lithiumDiamond ? "text-[var(--diamond)]" : "text-red"
                    }`}
                  >
                    ₦{getAmount(b.price)}
                  </span>
                </p>
                <p className="inter-medium md:text-base text-sm">({b.kits})</p>
              </div>
            </div>
          ))}

          <div className="flex justify-center mt-7">
            <button
              onClick={() => openModal(a)}
              disabled={inCart}
              className={` inter-semibold text-base hover:text-white text-red ${
                inCart && lithiumDiamond
                  ? "text-white bg-[#edbe71]"
                  : inCart
                  ? "bg-[#EDA4A6] text-white"
                  : lithiumPlatinum || tubularPremium
                  ? "text-white bg-gradient-to-r to-pink-500 from-red"
                  : lithiumDiamond
                  ? `text-white ${diamondGradient("r")}`
                  : "bg-white hover:bg-red shadow-lg"
              }  rounded-lg py-4 px-10`}
            >
              {inCart ? "In Cart" : "Add To Cart"}
            </button>
          </div>
        </div>
      </div>
    );
  });
};

export default DisplayProduct;
