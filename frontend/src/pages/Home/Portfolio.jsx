import { Link } from "react-router-dom";
import CustomChip from "../../components/CustomChip";
import InstagramIcon from "@mui/icons-material/Instagram";
import { useEffect, useState } from "react";
import { Container } from "@mui/material";
import config from "../../utils/config";
import { getPublicData } from "../../utils/api";
import { showAllOnMobile } from "../../utils/helper";
import { sectionTitle } from "../../lib/publicStyles";

const defaultRecentWork = [
  {
    name: "2.1kwp Canadian Solar",
    image: "/image-1.svg",
    link: "https://www.instagram.com/juwon__electric?igsh=MWdkc3VrYjQ2b2lydQ==",
    mobile: true,
  },
  {
    name: "7.5Kva Lithium Battery",
    image: "/image-2.svg",
    link: "https://www.instagram.com/juwon__electric?igsh=MWdkc3VrYjQ2b2lydQ%3D%3D",
    mobile: true,
  },
  {
    name: "5Kva Tubular Battery",
    image: "/image-3.svg",
    link: "https://www.instagram.com/juwon__electric?igsh=MWdkc3VrYjQ2b2lydQ%3D%3D",
    mobile: true,
  },
  {
    name: "1.2kwp Canadian Solar",
    image: "/image-4.svg",
    link: "https://www.instagram.com/juwon__electric?igsh=MWdkc3VrYjQ2b2lydQ%3D%3D",
    mobile: true,
  },
  {
    name: "3.2Kva Tubular Battery",
    image: "/image-5.svg",
    link: "https://www.instagram.com/juwon__electric?igsh=MWdkc3VrYjQ2b2lydQ%3D%3D",
    mobile: false,
  },
  {
    name: "8.8kwp Canadian Solar",
    image: "/image-6.svg",
    link: "https://www.instagram.com/juwon__electric?igsh=MWdkc3VrYjQ2b2lydQ%3D%3D",
    mobile: false,
  },
  {
    name: "2.1kwp Trina Solar",
    image: "/image-7.svg",
    link: "https://www.instagram.com/juwon__electric?igsh=MWdkc3VrYjQ2b2lydQ%3D%3D",
    mobile: false,
  },
  {
    name: "10Kva Lithium Battery",
    image: "/image-8.svg",
    link: "https://www.instagram.com/juwon__electric?igsh=MWdkc3VrYjQ2b2lydQ%3D%3D",
    mobile: false,
  },
];

const Portfolio = () => {
  const [recentWork, setRecentWork] = useState(defaultRecentWork);

  useEffect(() => {
    getPublicData("/portfolio", { featured: true })
      .then((response) =>
        setRecentWork(response.data?.length ? response.data : defaultRecentWork)
      )
      .catch(() => setRecentWork(defaultRecentWork));
  }, []);

  function handleMobileExpand(e) {
    e.preventDefault();
    setRecentWork(showAllOnMobile(recentWork));
  }

  return (
    <div className="mt-20">
      <CustomChip text="Portfolio" className="flex justify-center" />

      <h2 className={`text-deep_red ${sectionTitle} lg:mt-10 lg:mb-14 mt-8 mb-10 text-center`}>
        Our latest projects
      </h2>

      <Container maxWidth={config.padding.x}>
        <div className="grid lg:grid-cols-3 md:grid-cols-2 justify-center justify-items-center gap-10">
          {recentWork.map((work, i) => (
            <div
              key={work.id ?? work.image ?? i}
              className={`relative  ${
                !work.mobile && "md:block hidden"
              } md:w-[285px] md:h-[285px] sm:w-[350px] sm:h-[350px]  h-[350px]`}
            >
              <div
                className="overlay rounded-2xl flex flex-col justify-center items-center opacity-0 hover:opacity-100 transition-opacity"
              >
                <p className="sora-bold text-xl text-white text-center">
                  {work.name}
                </p>
                <Link
                  target="_blank"
                  rel="noopener noreferrer"
                  to={work.link}
                  className="flex items-center text-center gap-1 text-white mt-1 hover:underline"
                >
                  <InstagramIcon />
                  <p className="manrope-semibold text-xl">Follow Us</p>
                </Link>
              </div>

              <img
                className="object-cover h-full w-full rounded-2xl"
                src={work.image || work.img}
                alt={work.name || `work ${i + 1}`}
              />
            </div>
          ))}
        </div>

        <div
          className={`md:hidden mt-12 ${
            recentWork.every((a) => a.mobile) && "hidden"
          }`}
        >
          <Link
            onClick={handleMobileExpand}
            className="text-deep_red underline underline-offset-4 py-2 inter-medium text-xl text-center block"
          >
            See All
          </Link>
        </div>
      </Container>
    </div>
  );
};

export default Portfolio;
