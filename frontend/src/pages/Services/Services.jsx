import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { Link } from "react-router-dom";
import Header from "../../components/Header";
import { Container } from "@mui/material";
import config from "../../utils/config";
import CustomChip from "../../components/CustomChip";
import EastIcon from "@mui/icons-material/East";
import "react-responsive-carousel/lib/styles/carousel.min.css";
import { Carousel } from "react-responsive-carousel";

const Services = () => {
  const subtitle =
    "We sell and deploy premium quality products, we execute professional installations of our systems and technologies ensuring compliance with safety standards and quality assurance.";

  const offeringData = [
    {
      img: "/offer-1.svg",
      title: "System Design and Architecture",
      subtitle: `
      Our team does not just work, we do thorough inspections, assess the roof, and determine the best location for solar panels, batteries location and circuit boxes. 

Spacing the power line is our priority. This application of theoretical knowledge has made us stand out among many.

We are here for you!

      `,
    },
    {
      img: "/offer-2.svg",
      title: "Energy Audit",
      subtitle: `Our team provides expert assessments of your energy usage and solar potential, tailoring recommendations to best fit your unique residential and commercial properties.
`,
    },
    {
      img: "/offer-3.svg",
      title: "Light Solution",
      subtitle: `Light is needed everywhere and quick fixes are easy to find. At Juwon Electric, we take pride in delivering sustainable lighting solutions which is key. 
`,
    },
    {
      img: "/offer-4.svg",
      title: "After Sales Services",
      subtitle: `Selling to a customer is like winning a game of chess because we trust our services which in turn generates a cohesive and lasting relationship with our clients. 

We offer this After Sales Services.
`,
    },
    {
      img: "/offer-5.svg",
      title: "Maintenance ",
      subtitle: `Trust takes one higher. Our dedicated team does not rest until you are happy with the best maintenance of your equipment.

Trust us to take you higher.`,
    },
    // {
    //   img: "/offer-6.svg",
    //   title: "Maintenance",
    //   subtitle,
    // },
  ];

  const customerData = [
    {
      title: "Banking Sectors",
      subtitle: `Information technology must be reliable and available 24
                    hours a day, seven (7) days a week. Only solar systems and
                    back-up systems can provide such reliability for IT
                    Infrastructure, ATMs, and telecoms. This increases the reach
                    of the bank to more customers in rural, semi-urban areas,
                    Urban as well as schools and universities.`,
      image: "/panel-1.webp",
    },
    {
      title: "Hospitals",
      subtitle: `There is a demand for reliable and cost-effective electricity supplies to service remote medical and health care applications. Solar photovoltaic power is ideally suited to these applications because it is highly reliable, has low recurrent costs.`,
      image: "/panel-2.webp",
    },
    {
      title: "Community",
      subtitle: `We are capable of providing a large or small community with solar installations, such as; Mini grids, Solar powered boreholes, Solar powered street lights and solar powered community halls.`,
      image: "/panel-3.webp",
    },
    {
      title: "Farms",
      subtitle: `Most farms don’t have access to power. With our Solar powered system we provide electricity to farm and solar powered borehole for agriculture.`,
      image: "/panel-4.webp",
    },
    {
      title: "Government Institutions",
      subtitle: `Most government institution don’t have reliable power to aid their work. We provide reliable and sustainable power through renewable energy.`,
      image: "/panel-5.webp",
    },
    {
      title: "Academic Institutions",
      subtitle: `We design and install suitable solar and backup systems for schools in both urban and rural areas.`,
      image: "/panel-6.webp",
    },
  ];

  return (
    <>
      <Navbar />
      <Header text="OUR SERVICES" />

      <div className="energyBackground py-20">
        <Container maxWidth={config.padding.x}>
          <CustomChip
            text="What we offer"
            className="flex justify-center my-10"
          />

          <p className="inter-medium text-base text-faint text-center md:mb-20">
            Our Mission is to provide uninterrupted electric power to every
            Nigerian through clean renewable energy. Below is a list of service
            we offer our customers
          </p>

          <section className="mt-10 grid xl:grid-cols-3 md:grid-cols-2 justify-center xl:gap-16 gap-10">
            {offeringData.map((a, i) => (
              <div
                key={i}
                className={`shadow-md px-6 ${
                  i !== 1 ? "py-5" : "pb-5"
                } bg-white rounded`}
              >
                <div
                  className={`flex justify-center mb-10 ${i == 1 && "!-mt-10"}`}
                >
                  <img src={a.img} alt="" />
                </div>

                <h4 className="text-deep_red sora-semibold text-2xl text-center md:text-left mb-4">
                  {a.title}
                </h4>
                <p className="text-faint inter-medium text-justify md:text-left text-base mb-4">
                  {a.subtitle}
                </p>
                <Link className="text-faint" to={config.routes.packages}>
                  Let&apos;s go <EastIcon />
                </Link>
              </div>
            ))}
          </section>
        </Container>
      </div>

      <section className="my-5">
        <Container maxWidth={config.padding.x} className=" pt-10 pb-20">
          <h2 className="text-deep_red sora-bold lg:text-[40px] md:text-4xl text-2xl lg:my-16 my-10 text-center">
            Our Customers
          </h2>

          <Carousel autoPlay infiniteLoop swipeable={false} showThumbs={false}>
            {customerData.map((a, i) => (
              <div key={i} className="h-full">
                <div className="flex lg:flex-nowrap flex-wrap justify-center h-full">
                  <div className="bg-offWhite px-5 py-10 order-1 w-[700px] md:mt-0 -mt-12 rounded-t-xl">
                    <h4 className="text-deep_red my-5 sora-bold text-[22px]">
                      {a.title}
                    </h4>

                    <p className="text-faint inter-medium mb-12">
                      {a.subtitle}
                    </p>

                    <Link className="cursor-pointer bg-red text-white rounded-lg px-7 py-4 inter-bold md:!text-base !text-sm">
                      Contact us
                    </Link>
                  </div>

                  <img
                    src={a.image}
                    alt=""
                    className="h-[400px]  lg:order-1 w-full"
                  />
                </div>
              </div>
            ))}
          </Carousel>
        </Container>
      </section>
      <Footer />
    </>
  );
};

export default Services;
