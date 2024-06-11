import { Link } from "react-router-dom";
import config from "../../utils/config";

const EmptyCartUi = () => {
  return (
    <div className="flex justify-center my-5">
      <div className="text-center">
        <img src="/emptyCart.svg" />
        <p className="inter-medium md:text-[35px] text-[25px]">
          Your cart is empty
        </p>
        <p className="inter-regular text-[#838282] md:text-2xl text-lg">
          {/* Your cart is empty.  */}
          Start adding items to enjoy our services!
        </p>

        <Link
          to={config.routes.packages}
          className="mt-7 border rounded bg-red text-white flex items-center justify-center text-center py-2 px-5 sora-regular text-lg"
        >
          Go to packages
        </Link>
      </div>
    </div>
  );
};

export default EmptyCartUi;
