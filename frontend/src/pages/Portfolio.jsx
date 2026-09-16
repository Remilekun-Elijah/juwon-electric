import Header from "../components/Header";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Container } from "@mui/material";
import config from "../utils/config";
import { getPublicData } from "../utils/api";
import { showAllOnMobile } from "../utils/helper";

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

  function handleMobileExpand(e) {
    e.preventDefault();
    setPortfolioData(showAllOnMobile(portfolioData));
  }

  return (
    <div>
      <Navbar />
      <Header text="PORTFOLIO" />

      <Container maxWidth={config.padding.x} className="lg:my-28 my-20">
        <div className="grid lg:grid-cols-3 md:grid-cols-2 justify-center gap-10">
          {portfolioData.map((data, i) => (
            <div
              key={data.id ?? data.image ?? i}
              className={`relative  ${!data.mobile && "lg:block hidden"}`}
            >
              <div
                className="overlay rounded-lg flex flex-col justify-center items-center px-4 opacity-0 hover:opacity-100 transition-opacity"
              >
                <p className="sora-bold text-xl text-white text-center">
                  {data.name}
                </p>
              </div>

              <img
                className="w-full aspect-[380/525] object-cover rounded-lg"
                width={380}
                height={525}
                src={data.image || data.img}
                alt={data.name || `Portfolio ${i + 1}`}
              />
            </div>
          ))}
        </div>

        <div
          className={`mt-14 flex justify-center items-center lg:hidden ${
            portfolioData.every((a) => a.mobile) && "hidden"
          }`}
        >
          <Link
            onClick={handleMobileExpand}
            className="flex items-center justify-center min-h-[52px] py-3 rounded-lg text-brand-500 border-2 border-brand-500 hover:bg-brand-500 hover:text-white transition-colors duration-150 md:w-[400px] inter-medium text-xl text-center w-full"
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
