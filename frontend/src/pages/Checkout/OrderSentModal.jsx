import { Link } from "react-router-dom";
import config from "../../utils/config";

// eslint-disable-next-line react/prop-types
const OrderSentModal = ({ name, total }) => {
  return (
    <div className="flex justify-center items-center px-5">
      <div className="flex flex-col justify-center items-center">
        <img src="/order.svg" alt="" width={228} height={152} />
        Congrats {name},
        <p className="block inter-bold text-lg my-3">
          {" "}
          Your order has been placed!
        </p>
        {total && (
          <p className="block inter-regular text-base mb-3 text-center md:px-3">
            Order total: <span className="inter-bold">{total}</span>
          </p>
        )}
        <p className="block inter-regular text-base mb-5 text-center md:px-3">
          {" "}
          We’ll send a delivery confirmation text as soon as your order is
          packed.
        </p>
        <div className="flex md:gap-10 gap-3 mb-5 flex-wrap justify-center">
          <Link
            to={config.routes.home}
            className="inline-flex items-center min-h-[44px] border-2 border-brand-500 text-brand-500 rounded-lg py-2 px-5"
          >
            Go Home
          </Link>
          <Link
            to={config.routes.packages}
            className="inline-flex items-center min-h-[44px] border-0 text-white bg-brand-500 rounded-lg py-2 px-5 transition-opacity duration-150 hover:opacity-90"
          >
            Go To Packages
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderSentModal;
