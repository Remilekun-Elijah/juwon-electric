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

const Footer = () => {
  const { loading } = useSelector(getUserData),
    [emailAddress, setEmailAddress] = useState(""),
    dispatch = useDispatch(),
    handleChange = async (e) => {
      try {
        const emailRegex =
          /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$/gi;

        e.preventDefault();
        if (emailRegex.test(emailAddress)) {
          const res = await dispatch(subscribe({ emailAddress })).unwrap();
          if (res.success) {
            e.target.reset();
            setEmailAddress("");
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
            <img src={ILogoImg} className="md:mx-0 mx-auto" />
            <h1 className="inter-medium text-lg md:text-left text-center text-[#E67E82] my-5">
              Stay informed about our latest product.
            </h1>

            <form onSubmit={handleChange}>
              <Input
                required
                type="email"
                onChange={(e) => setEmailAddress(e.target.value)}
                className="p-3 !rounded-full !bg-transparent !text-[#E67E82]"
                disabled={loading}
                endDecorator={
                  loading ? (
                    <CircularProgress
                      color="error"
                      sx={{ color: "white" }}
                      size={20}
                    />
                  ) : (
                    <ArrowForwardIcon
                      onClick={handleChange}
                      className="bg-[#E67E82] cursor-pointer rounded-full text-white p-1"
                    />
                  )
                }
              />
            </form>
          </div>

          <div className="flex md:flex-row flex-col md:text-left text-center md:justify-between justify-center flex-wrap md:items-start items-center gap-10">
            <div>
              <h1 className="inter-medium text-lg !text-white mb-4">Support</h1>
              <ul className="!gap-y-5 inter-medium text-lg text-center">
                <li className="">
                  <Link to={config.routes.contact}>Help Center</Link>
                </li>
                <li className="my-1">
                  <Link to={config.routes.contact}>Contact us</Link>
                </li>
              </ul>
            </div>
            <div>
              <h1 className="inter-medium text-lg !text-white mb-4">
                Help and Solution
              </h1>
              <ul className="text-center">
                <li>
                  <Link to={config.routes.contact}>Talk to support</Link>
                </li>
                <li className="my-1">
                  <Link to={config.routes.contact}>Urgent response</Link>
                </li>
              </ul>
            </div>
            <div>
              <h1 className="inter-medium text-lg !text-white mb-4">Product</h1>
              <ul className="text-center">
                <li className="my-1">
                  <Link to={config.routes.packages}>Pricing</Link>
                </li>
              </ul>
            </div>
          </div>
        </footer>

        <div className="flex lg:justify-between justify-center flex-wrap md:text-white text-[#E67E82] mt-10 gap-5">
          <p className="text-center ">
            © 2024 Juwon Electric Inc. Copyright and rights reserved
          </p>

          <div className="flex md:gap-10 gap-2 flex-wrap ">
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
