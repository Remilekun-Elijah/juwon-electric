import Navbar from "../components/Navbar";
import Header from "../components/Header";
import Footer from "../components/Footer";
import config from "../utils/config";
import { Container } from "@mui/material";
import CustomChip from "../components/CustomChip";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import SendIcon from "@mui/icons-material/Send";
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from "@mui/icons-material/Facebook";
import XIcon from "@mui/icons-material/X";
import { FaTiktok } from "react-icons/fa";
import { Link } from "react-router-dom";

const Contact = () => {
  return (
    <div>
      <Navbar />
      <Header text="CONTACT US" />

      <div
        style={{
          backgroundImage: "url('/contactBackground.svg')",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <Container maxWidth={config.padding.x} className="py-24">
          <CustomChip
            text="Contact Us"
            className="md:flex justify-center py-10 hidden"
          />
          <p className="inter-medium text-base text-center text-faint">
            Have questions? Drop us a line via phone contact or send us email.
            We would be happy to help you :)
          </p>

          <section className="shadow md:p-10 py-5 px-5 bg-offWhite mt-10 rounded">
            <div>
              <div className="flex justify-center lg:mb-16 mb-5">
                <h2 className="text-deep_red lg:inline-block hidden border-b-[3px] border-deep_red sora-bold md:text-2xl text-xl text-center">
                  Get In Touch
                </h2>
              </div>

              <div className="flex gap-10 justify-around w-full flex-wrap">
                <form className="contact_form gap-5 flex flex-col">
                  <img
                    src="/getInTouch.svg"
                    alt=""
                    className="lg:hidden block"
                  />
                  <p className="sora-regular md:text-xl text-base text-faint lg:text-left text-center">
                    Leave us a message
                  </p>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    placeholder="Name"
                    className="input md:w-[350px] w-full border-2 bg-transparent p-3 rounded focus:outline-none block"
                  />
                  <input
                    type="tel"
                    name="phoneNumber"
                    id="phoneNumber"
                    placeholder="Phone Number"
                    className="input md:w-[350px] w-full border-2 bg-transparent p-3 rounded focus:outline-none block"
                  />
                  <input
                    type="email"
                    name="email"
                    id="email"
                    placeholder="Email Address"
                    className="input md:w-[350px] w-full border-2 bg-transparent p-3 rounded focus:outline-none block"
                  />

                  <textarea
                    rows={5}
                    className="resize-none md:w-[350px] w-full border-2 bg-transparent p-3 rounded focus:outline-none block"
                    placeholder="Your Message"
                    name="message"
                    id="message"
                  ></textarea>

                  <button className="flex gap-5 items-center inter-bold text-lg bg-red text-white py-2 justify-center rounded-md">
                    <p>Send</p> <SendIcon />
                  </button>
                </form>

                <section className="text-[#555] lg:mt-0 mt-5">
                  <img
                    src="/getInTouch.svg"
                    alt="get in touch"
                    className="lg:block hidden"
                  />
                  <div className="flex gap-2">
                    <PhoneIcon className="text-deep_red" />{" "}
                    <p className="inter-regular text-base">+234 81-4457-1553</p>
                  </div>
                  <div className="flex gap-2 my-4">
                    <EmailIcon className="text-deep_red" />{" "}
                    <p className="inter-regular text-base">
                      juwonofficial@gmail.com
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <LocationOnIcon className="text-deep_red" />{" "}
                    <p className="inter-regular text-base">
                      86, aladelola street. Ikosi ketu, Lagos, Nigeria
                    </p>
                  </div>

                  <div className="flex items-center gap-5 text-deep_red lg:mt-5 lg:justify-start justify-center mt-10">
                    <Link target="_blank" to={config.socials.insta}>
                      <InstagramIcon />
                    </Link>
                    <Link target="_blank" to={config.socials.fb}>
                      <FacebookIcon />
                    </Link>
                    <Link target="_blank" to={config.socials.x}>
                      <XIcon />
                    </Link>
                    <Link target="_blank" to={config.socials.tt}>
                      <FaTiktok className="text-xl" />
                    </Link>
                  </div>
                </section>
                {/* </div> */}
              </div>
            </div>
          </section>
        </Container>
      </div>
      <Footer />
    </div>
  );
};

export default Contact;
