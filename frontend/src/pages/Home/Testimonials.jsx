import CustomChip from "../../components/CustomChip";
import "react-responsive-carousel/lib/styles/carousel.min.css";
import { Carousel } from "react-responsive-carousel";
import { Container } from "@mui/material";
import config from "../../utils/config";
import Slider from "../../components/Slider";

const Testimonials = () => {
  const text =
    "is a Nigerian energy company specialized in clean renewable energy – Particularly Inverter systems, Battery backup and Solar solutions. Over the years we have powered various homes, offices and government institution across the country. ";

  const reviews = [
    [
      {
        name: "Damilare James",
        img: "/person-1.svg",
        message: text,
        rating: 5,
      },
      {
        name: "Clement Anthony",
        img: "/person-2.svg",
        message: text,
        rating: 4.5,
      },
    ],
    [
      {
        name: "Kehinde Ayodeji",
        img: "/person-3.svg",
        message: text,
        rating: 4,
      },
      {
        name: "Victor Okonkwo",
        img: "/person-4.svg",
        message: text,
        rating: 4.5,
      },
    ],
    [
      {
        name: "Caroline Felix",
        img: "/person-5.svg",
        message: text,
        rating: 4.5,
      },
      {
        name: "Moses Adebayo",
        img: "/person-6.svg",
        message: text,
        rating: 5,
      },
    ],
  ];

  return (
    <div>
      <Container maxWidth={config.padding.x} className="md:mt-40 mt-24 mb-10">
        <CustomChip text="Testimonials" className="flex justify-center my-5" />

        <h2 className="text-deep_red sora-bold lg:text-[40px] md:text-4xl text-2xl lg:my-16 my-10 md:px-0 px-2 text-center">
          What Our Clients Say About Us
        </h2>

        <Carousel autoPlay infiniteLoop swipeable={false} showThumbs={false}>
          {reviews.map((a, i) => (
            <Slider data={a} key={i} />
          ))}
        </Carousel>
      </Container>
    </div>
  );
};

export default Testimonials;
