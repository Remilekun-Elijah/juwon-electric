import Navbar from "../../components/Navbar";
import Header from "./Header";
import Benefits from "./Benefits";
import config from "../../utils/config";
import About from "./About";
import Portfolio from "./Portfolio";
import Testimonials from "./Testimonials";
import Footer from "../../components/Footer";

const LandingPage = () => {
  return (
    <>
      <Navbar />
      <div
        className="pb-10"
        style={{
          paddingTop: config.padding.y,
          background: "linear-gradient(to right, white, rgb(251, 233, 233))",
        }}
      >
        <Header />
        <Benefits />
      </div>

      <About />
      <Portfolio />
      <Testimonials />

      <Footer />
    </>
  );
};

export default LandingPage;
