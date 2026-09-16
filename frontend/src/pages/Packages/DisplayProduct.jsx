import CheckIcon from "@mui/icons-material/Check";
import { getAmount } from "../../utils/helper";
import { getCartItemKey } from "../../features/cart";
import { cardTitle } from "../../lib/publicStyles";

const DisplayProduct = ({ products, setOpen, setProduct, cart }) => {
  function openModal(product) {
    setProduct(product);
    setOpen(true);
  }

  return products.map((a) => {
    const inCart = cart.some(
        (c) => getCartItemKey(c) === getCartItemKey(a)
      ),
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
        key={getCartItemKey(a)}
        // flex-col + flex-1 options panel + mt-auto button: panels and buttons line up across a row.
        className={`shadow rounded-xl py-5 md:px-3 px-5 flex flex-col ${
          lithiumPlatinum || tubularPremium
            ? "bg-gradient-to-b to-pink-400 from-brand-500"
            : lithiumDiamond
            ? diamondGradient("b")
            : "bg-white"
        }`}
      >
        <h4
          className={`${cardTitle} mb-4 mt-2 text-center ${
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
          } rounded-xl px-5 py-7 flex-1 flex flex-col`}
        >
          {a.options.map((b, i) => (
            <div key={i} className="flex gap-3 mb-5">
              <CheckIcon
                className={`p-1 shrink-0 ${
                  lithiumDiamond ? "bg-[var(--diamond)]" : "bg-brand-500"
                } text-white rounded-full`}
              />
              <div>
                <p className="inter-medium md:text-base text-sm">
                  {b.name},{" "}
                  <span
                    className={`${
                      lithiumDiamond ? "text-[var(--diamond)]" : "text-brand-500"
                    }`}
                  >
                    ₦{getAmount(b.price)}
                  </span>
                </p>
                <p className="inter-medium md:text-base text-sm">({b.kits})</p>
              </div>
            </div>
          ))}

          <div className="flex justify-center mt-auto pt-2">
            <button
              onClick={() => openModal(a)}
              disabled={inCart}
              className={` inter-semibold text-base hover:text-white text-brand-500 ${
                inCart && lithiumDiamond
                  ? "text-white bg-[#edbe71]"
                  : inCart
                  ? "bg-[#EDA4A6] text-white"
                  : lithiumPlatinum || tubularPremium
                  ? "text-white bg-gradient-to-r to-pink-500 from-brand-500"
                  : lithiumDiamond
                  ? `text-white ${diamondGradient("r")}`
                  : "bg-white hover:bg-brand-500 shadow-lg"
              }  rounded-lg min-h-[52px] py-3 px-10 transition-colors duration-150 disabled:cursor-not-allowed`}
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
