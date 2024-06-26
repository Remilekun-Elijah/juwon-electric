import Navbar from "../../components/Navbar";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import CustomChip from "../../components/CustomChip";
import config from "../../utils/config";
import { Container } from "@mui/material";
import { useState } from "react";
import plans from "../../utils/plans.json";
import { useSelector } from "react-redux";
import { getCartData } from "../../features/cart";

import DisplayProduct from "./DisplayProduct";
import MiniTab from "./MiniTab";
import AddToCartModal from "./AddToCartModal";

const Packages = () => {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [product, setProduct] = useState(null);
  const { cart } = useSelector(getCartData);

  let tubular = [],
    lithium = [];
  plans.map((a) =>
    a.plan.map((a) =>
      a.type === "tubular" ? tubular.push(a) : lithium.push(a)
    )
  );

  return (
    <div>
      <Navbar />
      <Header text="PACKAGES" />

      <div
        className="pt-10 pb-20"
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
            <p className="mb-1">Choose packages</p>{" "}
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
            <DisplayProduct
              {...{
                products: active === 0 ? tubular : lithium,
                setOpen,
                setProduct,
                cart,
              }}
            />
          </div>
        </Container>
      </div>
      <AddToCartModal {...{ open, setOpen, product, setProduct }} />
      <Footer />
    </div>
  );
};

export default Packages;
