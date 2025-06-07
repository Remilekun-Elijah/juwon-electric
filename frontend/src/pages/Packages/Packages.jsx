import { Container } from "@mui/material";
import { useState } from "react";
import { useSelector } from "react-redux";
import CustomChip from "../../components/CustomChip";
import Footer from "../../components/Footer";
import Header from "../../components/Header";
import Navbar from "../../components/Navbar";
import { getCartData } from "../../features/cart";
import config from "../../utils/config";
import plans from "../../utils/plans.json";

import AddToCartModal from "./AddToCartModal";
import DisplayProduct from "./DisplayProduct";
import MiniTab from "./MiniTab";

const Packages = () => {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [product, setProduct] = useState(null);
  const { cart } = useSelector(getCartData);

  const categoryTypes = ["Tubular", "Lithium", "Hybrid Lithium"];
  let tubular = [],
    lithium = [],
    hybrid = [];

  plans.map((a) =>
    a.plan.map((a) =>
      a.type === "tubular"
        ? tubular.push(a)
        : a.type === "lithium"
        ? lithium.push(a)
        : hybrid.push(a)
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
            <p className="mb-1">Select the package</p>
            <p>that suits you best</p>
          </h2>

          <p className="inter-medium text-base text-center text-faint">
            Select the plan that fits your needs best, and don&apos;t hesitate
            to reach out to us.
          </p>

          <div className="flex justify-center my-10 ">
            <MiniTab
              {...{
                active,
                setActive,
                data: categoryTypes,
              }}
            />
          </div>

          <div className="grid xl:grid-cols-3 lg:grid-cols-3 md:grid-cols-2 gap-10">
            <DisplayProduct
              {...{
                products:
                  active === 0 ? tubular : active === 1 ? lithium : hybrid,
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
