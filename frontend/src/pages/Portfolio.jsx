import Header from "../components/Header";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Container } from "@mui/material";
import config from "../utils/config";
import { getPublicData } from "../utils/api";

const defaultPortfolioData = [
  { name: "2.1Kwp Trina Solar Panel", image: "/image-1.svg", mobile: true },
  { name: "5Kva Tubular Battery Energy", image: "/image-3.svg", mobile: true },
  { name: "8.8Kwp Canadian Solar Panel", image: "/image-6.svg", mobile: true },
  { name: "7.5Kva Lithium Battery", image: "/image-2.svg", mobile: true },
  { name: "550W Mono-Crystalline Solar Panel", image: "/portfolio-5.svg", mobile: true },
  { name: "2.5Kva Tubular Battery Energy", image: "/portfolio-6.svg", mobile: true },
  { name: "10Kva Lithium Battery Energy", image: "/portfolio-7.svg", mobile: false },
  { name: "550W Mono-Crystalline Solar Panel", image: "/portfolio-8.svg", mobile: false },
  { name: "10Kva Lithium Battery Energy", image: "/portfolio-9.svg", mobile: false },
  { name: "1.2Kwp Canadian Solar Panel", image: "/image-4.svg", mobile: false },
  { name: "7.5Kva Tubular Battery Energy", image: "/portfolio-11.svg", mobile: false },
  { name: "550W Mono-Crystalline Solar Panel", image: "/portfolio-12.svg", mobile: false },
];

const Portfolio = () => {
  const [portfolioData, setPortfolioData] = useState(defaultPortfolioData);

  useEffect(() => {
    getPublicData("/portfolio")
      .then((response) =>
        setPortfolioData(response.data?.length ? response.data : defaultPortfolioData)
      )
      .catch(() => setPortfolioData(defaultPortfolioData));
  }, []);

  function handleMobileExpand(e, state, setState) {
    e.preventDefault();
    const newState = state.map((data) => {
      data.mobile = true;
      return data;
    });
    setState(newState);
  }

  return (
    <div>
      <Navbar />
      <Header text="PORTFOLIO" />

      <Container maxWidth={config.padding.x} className="lg:my-36 my-24">
        <div className="grid lg:grid-cols-3 md:grid-cols-2 justify-center item-center gap-10">
          {portfolioData.map((data, i) => (
            <div
              key={i}
              className={`relative  ${!data.mobile && "lg:block hidden"}`}
            >
              <div
                className={`overlay rounded flex flex-col justify-center items-center animate__animated animate__bounceOutLeft hover:animate__bounceInLeft opacity-0 hover:opacity-100 transition-opacity`}
              >
                <p className="sora-bold text-xl text-white text-center">
                  {data.name}
                </p>
              </div>

              <img
                className="w-full"
                src={data.image || data.img}
                alt={`Portfolio ${i + 1}`}
              />
            </div>
          ))}
        </div>

        <div
          className={`mt-14 flex justify-center items-center lg:hidden ${
            portfolioData.filter((a) => a.mobile).length > 6 && "hidden"
          }`}
        >
          <br />
          <br />
          <Link
            onClick={(e) =>
              handleMobileExpand(e, portfolioData, setPortfolioData)
            }
            className={`text-red border-2 border-red hover:bg-red hover:text-white py-3 rounded-md md:w-[400px] inter-medium text-xl text-center block w-full`}
          >
            Load More
          </Link>
        </div>
      </Container>
      <Footer />
    </div>
  );
};

export default Portfolio;
