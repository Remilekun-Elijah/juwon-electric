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
import TurnstileWidget from "../components/TurnstileWidget";
import useTurnstile from "../utils/useTurnstile";
import {
  LIMITS,
  PHONE_MESSAGE,
  PHONE_PATTERN,
  isValidEmail,
  isValidPhone,
} from "../utils/validation";
import { buttonBase, buttonHover, fieldBase } from "../lib/publicStyles";

// Social icon links: ~40px tap target; the negative margin cancels the padding so icons stay put.
const socialLink = "inline-flex items-center justify-center p-2 -m-2 rounded-md transition-opacity duration-150 hover:opacity-80";

const Contact = () => {
  const { loading } = useSelector(getUserData),
    turnstile = useTurnstile({ action: "contact" }),
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

        if (payload.emailAddress && !isValidEmail(payload.emailAddress)) {
          Alert({ message: "Invalid email address", type: "error" });
          return;
        }

        if (!isValidPhone(payload.phoneNumber)) {
          Alert({ message: PHONE_MESSAGE, type: "error" });
          return;
        }

        if (!turnstile.ready) {
          Alert({
            message: "Please complete the security check and try again.",
            type: "error",
          });
          return;
        }

        const form = e.target;
        try {
          const res = await dispatch(
            sendMessage(turnstile.withToken(payload))
          ).unwrap();

          if (res?.success) form.reset();
        } finally {
          turnstile.reset();
        }
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
          <p className="inter-medium text-base leading-relaxed text-center text-faint">
            Have questions? Feel free to reach out to us via phone or email.
            We&apos;re here to assist you!
          </p>

          <section className="shadow md:p-10 py-6 px-5 bg-white mt-10 rounded-lg">
            <div>
              <div className="flex justify-center lg:mb-16 mb-5">
                <h2 className="text-deep_red lg:inline-block hidden border-b-[3px] border-deep_red sora-bold md:text-2xl text-xl leading-snug pb-1 text-center">
                  Get In Touch
                </h2>
              </div>

              <div className="flex gap-10 justify-around w-full flex-wrap">
                <form
                  onSubmit={handleSubmit}
                  className="contact_form gap-5 flex flex-col w-full md:w-auto"
                >
                  <img
                    src="/getInTouch.svg"
                    alt=""
                    width={258}
                    height={258}
                    className="lg:hidden block mx-auto w-[258px] md:w-[350px]"
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
                    maxLength={LIMITS.personName}
                    placeholder="Name"
                    className={`input ${fieldBase} md:w-[350px] w-full bg-transparent`}
                  />
                  <input
                    type="tel"
                    name="phoneNumber"
                    required
                    id="phoneNumber"
                    maxLength={LIMITS.phoneNumber}
                    pattern={PHONE_PATTERN}
                    title={PHONE_MESSAGE}
                    placeholder="Phone Number"
                    className={`input ${fieldBase} md:w-[350px] w-full bg-transparent`}
                  />
                  <input
                    type="email"
                    name="emailAddress"
                    id="emailAddress"
                    maxLength={LIMITS.email}
                    placeholder="Email Address"
                    className={`input ${fieldBase} md:w-[350px] w-full bg-transparent`}
                  />

                  <textarea
                    rows={5}
                    className={`resize-none ${fieldBase} md:w-[350px] w-full bg-transparent`}
                    placeholder="Your Message"
                    name="message"
                    required
                    minLength={3}
                    maxLength={LIMITS.contactMessage}
                    id="message"
                  ></textarea>

                  <div className="flex flex-col">
                    <TurnstileWidget
                      turnstile={turnstile}
                      errorClassName="text-sm text-deep_red mb-2"
                    />
                    <button
                      disabled={loading || !turnstile.ready}
                      className={`${buttonBase} ${buttonHover} w-full bg-brand-500 text-white`}
                    >
                      {loading ? (
                        <CircularProgress
                          color="error"
                          sx={{ color: "white" }}
                          size={20}
                        />
                      ) : (
                        <>
                          <span>Send</span> <SendIcon fontSize="small" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <section className="text-[#555] lg:mt-0 mt-5">
                  <img
                    src="/getInTouch.svg"
                    alt="get in touch"
                    width={258}
                    height={258}
                    className="lg:block hidden"
                  />
                  <div className="flex gap-2">
                    <PhoneIcon className="text-deep_red shrink-0" />{" "}
                    <p className="inter-regular text-base leading-6">
                      +2348144571553, +2347042394925, +2349032560291
                    </p>
                  </div>
                  <div className="flex gap-2 my-4">
                    <EmailIcon className="text-deep_red shrink-0" />{" "}
                    <p className="inter-regular text-base leading-6 min-w-0 break-words">
                      inquiries@juwonelectric.com
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <LocationOnIcon className="text-deep_red shrink-0" />{" "}
                    <p className="inter-regular text-base leading-6">
                      86, aladelola street, Ikosi ketu, Lagos, Nigeria
                    </p>
                  </div>

                  <div className="flex items-center gap-5 text-deep_red lg:mt-5 lg:justify-start justify-center mt-10">
                    <Link
                      className={socialLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      to={config.socials.insta}
                      aria-label="Instagram"
                    >
                      <InstagramIcon />
                    </Link>
                    <Link
                      className={socialLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      to={config.socials.fb}
                      aria-label="Facebook"
                    >
                      <FacebookIcon />
                    </Link>
                    <Link
                      className={socialLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      to={config.socials.x}
                      aria-label="X"
                    >
                      <XIcon />
                    </Link>
                    <Link
                      className={socialLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      to={config.socials.tt}
                      aria-label="TikTok"
                    >
                      <FaTiktok className="text-xl" />
                    </Link>
                  </div>
                </section>
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
