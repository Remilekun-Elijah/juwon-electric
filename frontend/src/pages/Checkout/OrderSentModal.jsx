import { Link } from "react-router-dom";
import config from "../../utils/config";

// eslint-disable-next-line react/prop-types
const OrderSentModal = ({ name }) => {
  return (
    <div className="flex justify-center items-center px-5">
      <div className="flex flex-col justify-center items-center">
        <img src="/order.svg" alt="" />
        Congrats {name},
        <p className="block inter-bold text-lg my-3">
          {" "}
          Your order has been placed!
        </p>
        <p className="block inter-regular text-base mb-5 text-center md:px-3">
          {" "}
          We’ll send a delivery confirmation text as soon as your order is
          packed.
        </p>
        <div className="flex nd:justify-between md:gap-10 gap-3 mb-5 flex-wrap justify-center">
          <Link
            to={config.routes.home}
            className="border-2 border-red text-red rounded-lg py-2 px-5"
          >
            Go Home
          </Link>
          <Link
            to={config.routes.packages}
            className="border-0 text-white bg-red rounded-lg py-2 px-5"
          >
            Go To Packages
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderSentModal;
