import { Container } from "@mui/material";
import { Input } from "@mui/joy";
import config from "../utils/config";
import { Link } from "react-router-dom";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

const Footer = () => {
  return (
    <section className="bg-deep_red p-5">
      <Container maxWidth={config.padding.x}>
        <footer className="flex md:mt-10 md:justify-between justify-center text-[#E67E82] flex-wrap md:items-stretch items-center">
          <div className="about md:mb-0 mb-10 md:mt-0 mt-8">
            <img src="/logo.svg" className="md:mx-0 mx-auto" />
            <h1 className="inter-medium text-lg text-[#E67E82] my-5">
              Be the first to know our new product
            </h1>

            <Input
              className="p-3 !rounded-full !bg-transparent !text-[#E67E82]"
              endDecorator={
                <ArrowForwardIcon className="bg-[#E67E82] rounded-full text-white p-1" />
              }
            />
          </div>

          <div className="flex md:flex-row flex-col md:text-left text-center md:justify-between justify-center flex-wrap md:item-start items-center gap-10">
            <div>
              <h1 className="inter-medium text-lg !text-white mb-4">
                Supports
              </h1>
              <ul className="!gap-y-5 inter-medium text-lg">
                <li className="">
                  <Link to={"/"}>Help Center</Link>
                </li>
                <li className="my-1">
                  <Link to={"/"}>Account information</Link>
                </li>
                <li>
                  <Link to={"/"}>About</Link>
                </li>
                <li className="my-1">
                  <Link to={"/"}>Contact us</Link>
                </li>
              </ul>
            </div>
            <div>
              <h1 className="inter-medium text-lg !text-white mb-4">
                Help and Solution
              </h1>
              <ul className="">
                <li>
                  <Link to={"/"}>Talk to support</Link>
                </li>
                <li className="my-1">
                  <Link to={"/"}>Support docs</Link>
                </li>
                <li>
                  <Link to={"/"}>System status</Link>
                </li>
                <li className="my-1">
                  <Link to={"/"}>Urgent response</Link>
                </li>
              </ul>
            </div>
            <div>
              <h1 className="inter-medium text-lg !text-white mb-4">Product</h1>
              <ul className="">
                <li>
                  <Link to={"/"}>Update</Link>
                </li>
                <li className="my-1">
                  <Link to={"/"}>Security</Link>
                </li>
                <li>
                  <Link to={"/"}>Beta test</Link>
                </li>
                <li className="my-1">
                  <Link to={"/"}>Pricing product</Link>
                </li>
              </ul>
            </div>
          </div>
        </footer>

        <div className="flex justify-between flex-wrap md:text-white text-[#E67E82] mt-10 gap-5">
          <p className="text-center ">
            © 2024 Juwon Electric Inc. Copyright and rights reserved
          </p>

          <div className="flex gap-10 flex-wrap ">
            <Link>Terms and Conditions</Link>
            <ul>
              <li className="list-style" style={{ listStyleType: "disc" }}>
                <Link>Privacy Policy</Link>
              </li>
            </ul>
          </div>
        </div>
      </Container>
      ;
    </section>
  );
};

export default Footer;
