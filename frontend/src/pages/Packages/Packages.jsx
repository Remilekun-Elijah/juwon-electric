import Navbar from "../../components/Navbar";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import CustomChip from "../../components/CustomChip";
import config from "../../utils/config";
import { Container } from "@mui/material";
import { useState } from "react";
import CheckIcon from "@mui/icons-material/Check";
import plans from "../../utils/plans.json";
import { getAmount } from "../../utils/helper";
// eslint-disable-next-line react/prop-types
function MiniTab({ active, setActive, data = [] }) {
  return (
    <div className="inline-flex gap-2 bg-white rounded-md p-2">
      {data.map((a, i) => (
        <p
          onClick={() => setActive(i)}
          key={i}
          className={`py-2 rounded-md cursor-pointer inter-medium px-3 ${
            active === i ? "bg-red text-white shadow-lg" : "bg-white text-black"
          }`}
        >
          {a}
        </p>
      ))}
    </div>
  );
}

const Packages = () => {
  const [active, setActive] = useState(1);

  let tubular = [],
    lithium = [];
  plans.map((a) =>
    a.plan.map((a) =>
      a.type === "tubular" ? tubular.push(a) : lithium.push(a)
    )
  );
  console.log(tubular);
  return (
    <div>
      <Navbar />
      <Header text="PACKAGES" />

      <div
        className=" py-20"
        style={{
          backgroundImage: "url('/contactBackground.svg')",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <Container maxWidth={config.padding.x}>
          <CustomChip
            text="Our Packages"
            className="flex justify-center my-10"
          />
          <h2 className="text-deep_red sora-bold lg:text-[40px] md:text-4xl text-2xl lg:mt-12 mt-10 mb-7 text-center">
            <p className="mb-1">Choose Packages</p>{" "}
            <p> that&apos;s right for you</p>
          </h2>

          <p className="inter-medium text-base text-center text-faint">
            Choose plan that works best for you, feel free to contact us
          </p>

          <div className="flex justify-center my-10">
            <MiniTab
              {...{
                active,
                setActive,
                data: ["Tubular Battery", "Lithium Battery"],
              }}
            />
          </div>

          <div className="grid xl:grid-cols-3 lg:grid-cols-3 md:grid-cols-2 gap-10">
            {active === 0
              ? tubular.map((a, i) => (
                  <div
                    key={i}
                    className="shadow rounded-xl py-5 md:px-3 px-5 bg-white"
                  >
                    <h4 className="sora-semibold text-2xl mb-5 mt-2 text-center">
                      {"Basic" || a.name}
                    </h4>

                    <p className="inter-medium md:text-lg text-sm text-center mb-5 md:text-[#EDA4A6] text-[#e26767]">
                      {a.load}
                    </p>

                    <p className="text-center flex justify-center gap-2 mb-3 items-center">
                      <span className="inline-flex">
                        <strong className="md:text-[50px] text-4xl drop-shadow-md p-0 m-0 inter-semibold">
                          {a.kva}
                        </strong>
                        <sup className="text-[#EDA4A6] drop-shadow-md text-lg p-0 mt-2 ml-1 inter-medium">
                          kva
                        </sup>
                      </span>
                      {a.volt && (
                        <span className="inline-flex">
                          <strong className="md:text-[50px] text-4xl drop-shadow-md p-0 m-0 inter-semibold">
                            {a.volt}
                          </strong>
                          <sup className="text-[#EDA4A6] drop-shadow-md text-lg p-0 mt-2 ml-1 inter-medium">
                            v
                          </sup>
                        </span>
                      )}
                    </p>

                    <div className="bg-[#F9FAFB] rounded-xl px-5 py-7">
                      {a.options.map((b, i) => (
                        <div key={i} className="flex gap-3 mb-5">
                          <CheckIcon className="p-1 bg-red text-white rounded-full" />
                          <div>
                            <p className="inter-medium md:text-lg text-sm">
                              {b.name},{" "}
                              <span className="text-red">
                                ₦{getAmount(b.price)}
                              </span>
                            </p>
                            <p className="inter-medium md:text-lg text-sm">
                              ({b.kits})
                            </p>
                          </div>
                        </div>
                      ))}

                      <div className="flex justify-center mt-7">
                        <button className="shadow-lg inter-semibold text-lg text-red bg-white rounded-xl py-4 px-10">
                          Add To Cart
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              : lithium.map((a, i) => (
                  <div
                    key={i}
                    className={`shadow rounded-xl py-5 md:px-3 px-5 ${
                      a.name === "Platinum" ? "bg-red" : "bg-white"
                    }`}
                  >
                    <h4
                      className={`sora-semibold text-2xl mb-5 mt-2 text-center ${
                        a.name === "Platinum" ? "text-white" : "text-black"
                      }`}
                    >
                      {a.name}
                    </h4>

                    <p
                      className={`inter-medium md:text-lg text-sm text-center mb-5 
                      ${
                        a.name === "Platinum"
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
                            a.name === "Platinum" ? "text-white" : "text-black"
                          }`}
                        >
                          {a.kva}
                        </strong>
                        <sup
                          className={` ${
                            a.name === "Platinum"
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
                              a.name === "Platinum"
                                ? "text-white"
                                : "text-black"
                            } text-4xl drop-shadow-md p-0 m-0 inter-semibold`}
                          >
                            {a.volt}
                          </strong>
                          <sup className="text-[#EDA4A6] drop-shadow-md text-lg p-0 mt-2 ml-1 inter-medium">
                            v
                          </sup>
                        </span>
                      )}
                    </p>

                    <div className="bg-[#F9FAFB] rounded-xl px-5 py-7">
                      {a.options.map((b, i) => (
                        <div key={i} className="flex gap-3 mb-5">
                          <CheckIcon className="p-1 bg-red text-white rounded-full" />
                          <div>
                            <p className="inter-medium md:text-lg text-sm">
                              {b.name},{" "}
                              <span className="text-red">
                                ₦{getAmount(b.price)}
                              </span>
                            </p>
                            <p className="inter-medium md:text-lg text-sm">
                              ({b.kits})
                            </p>
                          </div>
                        </div>
                      ))}

                      <div className="flex justify-center mt-7">
                        <button className="shadow-lg inter-semibold text-lg text-red bg-white rounded-xl py-4 px-10">
                          Add To Cart
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        </Container>
      </div>
      <Footer />
    </div>
  );
};

export default Packages;
