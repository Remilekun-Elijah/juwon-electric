import { Link } from "react-router-dom";
import CustomChip from "../../components/CustomChip";
import InstagramIcon from "@mui/icons-material/Instagram";
import { useState } from "react";

const Portfolio = () => {
  const [recentWork, setRecentWork] = useState([
    {
      name: "1.2kwp Canadian Solar",
      img: "/image-1.svg",
      link: "https://www.instagram.com/juwon__electric?igsh=MWdkc3VrYjQ2b2lydQ==",
      mobile: true,
    },
    {
      name: "7.5Kva Lithium Battery",
      img: "/image-2.svg",
      link: "https://www.instagram.com/juwon__electric?igsh=MWdkc3VrYjQ2b2lydQ%3D%3D",
      mobile: true,
    },
    {
      name: "5Kva Tubular Battery",
      img: "/image-3.svg",
      link: "https://www.instagram.com/juwon__electric?igsh=MWdkc3VrYjQ2b2lydQ%3D%3D",
      mobile: true,
    },
    {
      name: "1.2kwp Canadian Solar",
      img: "/image-4.svg",
      link: "https://www.instagram.com/juwon__electric?igsh=MWdkc3VrYjQ2b2lydQ%3D%3D",
      mobile: true,
    },
    {
      name: "3.2Kva Tubular Battery",
      img: "/image-5.svg",
      link: "https://www.instagram.com/juwon__electric?igsh=MWdkc3VrYjQ2b2lydQ%3D%3D",
      mobile: false,
    },
    {
      name: "8.8kwp Canadian Solar",
      img: "/image-6.svg",
      link: "https://www.instagram.com/juwon__electric?igsh=MWdkc3VrYjQ2b2lydQ%3D%3D",
      mobile: false,
    },
    {
      name: "4.2kwp Trinna Solar",
      img: "/image-7.svg",
      link: "https://www.instagram.com/juwon__electric?igsh=MWdkc3VrYjQ2b2lydQ%3D%3D",
      mobile: false,
    },
    {
      name: "10Kva Lithium Battery",
      img: "/image-8.svg",
      link: "https://www.instagram.com/juwon__electric?igsh=MWdkc3VrYjQ2b2lydQ%3D%3D",
      mobile: false,
    },
  ]);

  function handleMobileExpand(e, state, setState) {
    e.preventDefault();
    const newState = state.map((data) => {
      data.mobile = true;
      return data;
    });
    setState(newState);
  }

  return (
    <div className="mt-20">
      <CustomChip text="Portfolio" className="flex justify-center" />

      <h2 className="text-deep_red sora-bold lg:text-[40px] md:text-4xl text-2xl lg:my-16 my-10 text-center">
        Our Recent Work
      </h2>

      <div className="flex justify-center item-center gap-10 flex-wrap">
        {recentWork.map((work, i) => (
          <div key={i} className={`relative  ${!work.mobile && "hidden"}`}>
            <div
              className={`overlay rounded-2xl flex flex-col justify-center items-center animate__animated animate__bounceOutLeft hover:animate__bounceInLeft opacity-0 hover:opacity-100 transition-opacity`}
            >
              <p className="sora-bold text-xl text-white">{work.name}</p>
              <Link
                target="_blank"
                to={work.link}
                className="flex items-center gap-1 text-white mt-1"
              >
                <InstagramIcon />
                <p className="manrope-semibold text-xl">Follow Us</p>
              </Link>
            </div>

            <img className="" src={work.img} alt={`work ${i + 1}`} />
          </div>
        ))}
      </div>

      <div
        className={`md:hidden ${
          recentWork.filter((a) => a.mobile).length > 4 && "hidden"
        }`}
      >
        <br />
        <br />
        <Link
          onClick={(e) => handleMobileExpand(e, recentWork, setRecentWork)}
          className={`text-deep_red underline pb-1 inter-medium text-xl text-center block mt-`}
        >
          See All
        </Link>
      </div>
    </div>
  );
};

export default Portfolio;
