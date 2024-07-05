import Navbar from "../components/Navbar";
import Header from "../components/Header";
import Footer from "../components/Footer";
import config from "../utils/config";
import { CircularProgress, Container } from "@mui/material";
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
import { useDispatch, useSelector } from "react-redux";
import { getUserData, sendMessage } from "../features/user";
import Alert from "../utils/Alert";

const Contact = () => {
  // const [payload, setPayload] =useS
  const { loading } = useSelector(getUserData),
    dispatch = useDispatch(),
    handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const payload = {
          name: e.target.name.value,
          phoneNumber: e.target.phoneNumber.value,
          emailAddress: e.target.emailAddress.value,
          message: e.target.message.value,
        };

        const emailRegex =
          /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$/gi;

        if (
          payload.emailAddress &&
          emailRegex.test(payload.emailAddress) === false
        ) {
          Alert({ message: "Invalid email address", type: "error" });
          return;
        }

        const res = await dispatch(sendMessage(payload)).unwrap();

        if (res.success) e.target.reset();
      } catch (error) {
        console.error(error);
      }
    };
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

          <section className="shadow md:p-10 py-5 px-5 bg-white mt-10 rounded">
            <div>
              <div className="flex justify-center lg:mb-16 mb-5">
                <h2 className="text-deep_red lg:inline-block hidden border-b-[3px] border-deep_red sora-bold md:text-2xl text-xl text-center">
                  Get In Touch
                </h2>
              </div>

              <div className="flex gap-10 justify-around w-full flex-wrap">
                <form
                  onSubmit={handleSubmit}
                  className="contact_form gap-5 flex flex-col"
                >
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
                    required
                    id="name"
                    minLength={2}
                    placeholder="Name"
                    className="input md:w-[350px] w-full border-2 bg-transparent p-3 rounded focus:outline-none block"
                  />
                  <input
                    type="tel"
                    name="phoneNumber"
                    required
                    id="phoneNumber"
                    minLength={11}
                    maxLength={14}
                    placeholder="Phone Number"
                    className="input md:w-[350px] w-full border-2 bg-transparent p-3 rounded focus:outline-none block"
                  />
                  <input
                    type="email"
                    name="emailAddress"
                    // required
                    id="emailAddress"
                    placeholder="Email Address"
                    className="input md:w-[350px] w-full border-2 bg-transparent p-3 rounded focus:outline-none block"
                  />

                  <textarea
                    rows={5}
                    className="resize-none md:w-[350px] w-full border-2 bg-transparent p-3 rounded focus:outline-none block"
                    placeholder="Your Message"
                    name="message"
                    required
                    minLength={3}
                    maxLength={3000}
                    id="message"
                  ></textarea>

                  <button
                    disabled={loading}
                    className="flex gap-5 items-center inter-bold text-lg bg-red text-white py-2 justify-center rounded-md"
                  >
                    {loading ? (
                      <CircularProgress
                        color="error"
                        sx={{ color: "white" }}
                        size={20}
                      />
                    ) : (
                      <>
                        <p>Send</p> <SendIcon />
                      </>
                    )}
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
                    <p className="inter-regular text-base">
                      +2348144571553, +2347042394925, +2349032560291
                    </p>
                  </div>
                  <div className="flex gap-2 my-4">
                    <EmailIcon className="text-deep_red" />{" "}
                    <p className="inter-regular text-base">
                      inquiries@juwonelectric.com
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <LocationOnIcon className="text-deep_red" />{" "}
                    <p className="inter-regular text-base">
                      86, aladelola street, Ikosi ketu, Lagos, Nigeria
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
