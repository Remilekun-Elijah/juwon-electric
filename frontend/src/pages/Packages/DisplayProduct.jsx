// import React from "react";
import { getAmount } from "../../utils/helper";
import CheckIcon from "@mui/icons-material/Check";

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

    return (
      <div
        key={i}
        className={`shadow rounded-xl py-5 md:px-3 px-5 ${
          a.type === "lithium" && a.name === "Platinum" ? "bg-red" : "bg-white"
        }`}
      >
        <h4
          className={`sora-semibold text-2xl mb-5 mt-2 text-center ${
            a.type === "lithium" && a.name === "Platinum"
              ? "text-white"
              : "text-black"
          }`}
        >
          {a.type === "lithium" ? a.name : "Basic"}
        </h4>

        <p
          className={`inter-medium md:text-base text-sm text-center mb-5 
                      ${
                        a.type === "lithium" && a.name === "Platinum"
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
                a.type === "lithium" && a.name === "Platinum"
                  ? "text-white"
                  : "text-black"
              }`}
            >
              {a.kva}
            </strong>
            <sup
              className={` ${
                a.type === "lithium" && a.name === "Platinum"
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
                  a.type === "lithium" && a.name === "Platinum"
                    ? "text-white"
                    : "text-black"
                } text-4xl drop-shadow-md p-0 m-0 inter-semibold`}
              >
                {a.volt}
              </strong>
              <sup
                className={` ${
                  a.type === "lithium" && a.name === "Platinum"
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
            a.type === "lithium" && a.name === "Platinum"
              ? "bg-white"
              : "bg-[#F9FAFB]"
          } rounded-xl px-5 py-7`}
        >
          {a.options.map((b, i) => (
            <div key={i} className="flex gap-3 mb-5">
              <CheckIcon className="p-1 bg-red text-white rounded-full" />
              <div>
                <p className="inter-medium md:text-base text-sm">
                  {b.name},{" "}
                  <span className="text-red">₦{getAmount(b.price)}</span>
                </p>
                <p className="inter-medium md:text-base text-sm">({b.kits})</p>
              </div>
            </div>
          ))}

          <div className="flex justify-center mt-7">
            <button
              onClick={() => openModal(a)}
              disabled={a?.id === f?.id}
              className={` inter-semibold text-base hover:text-white text-red ${
                a?.id === f?.id
                  ? "bg-[#EDA4A6] text-white "
                  : "bg-white hover:bg-red shadow-lg"
              }  rounded-xl py-4 px-10`}
            >
              {a?.id === f?.id ? "In Cart" : "Add To Cart"}
            </button>
          </div>
        </div>
      </div>
    );
  });
};

export default DisplayProduct;
