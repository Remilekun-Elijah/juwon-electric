import { CircularProgress, Container } from "@mui/material";
import { Input } from "@mui/joy";
import config from "../utils/config";
import { Link } from "react-router-dom";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useDispatch, useSelector } from "react-redux";
import { getUserData, subscribe } from "../features/user";
import { useState } from "react";
import Alert from "../utils/Alert";
import { ILogoImg } from "../utils/icon";
import TurnstileWidget from "./TurnstileWidget";
import useTurnstile from "../utils/useTurnstile";
import { LIMITS, isValidEmail } from "../utils/validation";

// Footer column heading and link list: same size, weight and rhythm in every column.
const footerHeading = "inter-medium text-lg leading-snug !text-white mb-4";
const footerList = "text-center text-base leading-relaxed space-y-2";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { loading } = useSelector(getUserData),
    [emailAddress, setEmailAddress] = useState(""),
    turnstile = useTurnstile({ action: "subscribe" }),
    dispatch = useDispatch(),
    handleChange = async (e) => {
      try {
        e.preventDefault();
        if (loading) return;
        if (isValidEmail(emailAddress)) {
          if (!turnstile.ready) {
            Alert({
              message: "Please complete the security check and try again.",
              type: "error",
            });
            return;
          }
          try {
            const res = await dispatch(
              subscribe(turnstile.withToken({ emailAddress }))
            ).unwrap();
            if (res?.success) {
              setEmailAddress("");
            }
          } finally {
            turnstile.reset();
          }
        } else Alert({ message: "Invalid email address", type: "error" });
      } catch (error) {
        console.error(error);
      }
    };

  return (
    <section className="bg-deep_red p-5">
      <Container maxWidth={config.padding.x}>
        <footer className="flex md:mt-10 lg:justify-between justify-center text-[#E67E82] flex-wrap md:items-stretch items-center">
          <div className="about lg:mb-0 mb-10 md:mt-0 mt-8">
            <img src={ILogoImg} alt="Juwon Electric" width={88} height={62} className="md:mx-0 mx-auto" />
            <h1 className="inter-medium text-lg leading-snug md:text-left text-center text-[#E67E82] my-5">
              Stay informed about our latest product.
            </h1>

            <form onSubmit={handleChange}>
              <Input
                required
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="p-3 !rounded-full !bg-transparent !text-[#E67E82]"
                disabled={loading}
                slotProps={{
                  input: { maxLength: LIMITS.email, "aria-label": "Email address" },
                }}
                endDecorator={
                  loading ? (
                    <CircularProgress
                      color="error"
                      sx={{ color: "white" }}
                      size={20}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={handleChange}
                      aria-label="Subscribe"
                      className="inline-flex rounded-full transition-opacity duration-150 hover:opacity-90"
                    >
                      <ArrowForwardIcon className="bg-[#E67E82] cursor-pointer rounded-full text-white p-1" />
                    </button>
                  )
                }
              />
              <TurnstileWidget
                turnstile={turnstile}
                errorClassName="text-sm text-[#E67E82] mt-2 md:text-left text-center"
              />
            </form>
          </div>

          <div className="flex md:flex-row flex-col md:text-left text-center md:justify-between justify-center flex-wrap md:items-start items-center gap-10">
            <div>
              <h1 className={footerHeading}>Support</h1>
              <ul className={footerList}>
                <li>
                  <Link to={config.routes.contact}>Help Center</Link>
                </li>
                <li>
                  <Link to={config.routes.contact}>Contact us</Link>
                </li>
              </ul>
            </div>
            <div>
              <h1 className={footerHeading}>Help and Solution</h1>
              <ul className={footerList}>
                <li>
                  <Link to={config.routes.contact}>Talk to support</Link>
                </li>
                <li>
                  <Link to={config.routes.contact}>Urgent response</Link>
                </li>
              </ul>
            </div>
            <div>
              <h1 className={footerHeading}>Product</h1>
              <ul className={footerList}>
                <li>
                  <Link to={config.routes.packages}>Pricing</Link>
                </li>
              </ul>
            </div>
          </div>
        </footer>

        <div className="flex lg:justify-between justify-center flex-wrap md:text-white text-[#E67E82] mt-10 gap-5">
          <p className="text-center ">
            © {currentYear} Juwon Electric Inc. Copyright and rights reserved
          </p>

          <div className="flex md:gap-10 gap-x-4 gap-y-2 flex-wrap ">
            <Link>Terms and Conditions</Link>
            <ul>
              <li className="md:list-disc">
                <Link>Privacy Policy</Link>
              </li>
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default Footer;
