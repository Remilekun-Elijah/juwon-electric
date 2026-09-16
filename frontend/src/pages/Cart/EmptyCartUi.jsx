import { Link } from "react-router-dom";
import config from "../../utils/config";
import { buttonBase, buttonHover } from "../../lib/publicStyles";

const EmptyCartUi = () => {
  return (
    <div className="flex justify-center my-5">
      <div className="text-center">
        <img src="/emptyCart.svg" alt="Empty cart" width={386} height={386} className="mx-auto" />
        <p className="inter-medium lg:text-[35px] md:text-[30px] text-xl leading-tight md:mb-2 lg:mb-3 mb-1">
          Your cart is empty
        </p>
        <p className="inter-regular text-[#838282] md:text-2xl text-base">
          Start adding items to enjoy our services!
        </p>

        <Link
          to={config.routes.packages}
          className={`${buttonBase} ${buttonHover} w-full mt-7 md:mt-10 border bg-brand-500 text-white`}
        >
          Go to packages
        </Link>
      </div>
    </div>
  );
};

export default EmptyCartUi;
