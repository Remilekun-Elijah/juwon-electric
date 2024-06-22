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
        message: `It's working perfectly. It worth it.
        Have never been in a blackout for a sec. I Dey follow all the procedures told during installment. So I'm good.`,
        rating: 5,
      },
      {
        name: "Juliet Anthony",
        img: "/person-2.svg",
        message:
          "Working well, except that more power is more consumption and more consumption is more expenditure 😄😄😄 \nNice job. My happiness\n level has increased.",
        rating: 4.5,
      },
    ],
    [
      {
        name: "Kehinde Ayodeji",
        img: "/person-3.svg",
        message:
          "Absolutely loved how professional your team was. Started using my inverter already and yes, I LOVE it already, Will definitely be back for more. I hundred percent recommend @juwon_electric to anyone looking to get an inverter.",
        rating: 5,
      },
      {
        name: "Victor Okonkwo",
        img: "/person-4.svg",
        message: `
        Thanks for the good job juwon electric. I have never regret your services since am on the grid of 2.5kva inverter it Amazing, it has reduced the cost fuelling Gen and environmental population reduced totally.
        Thanks alot.`,
        rating: 4.5,
      },
    ],
    [
      {
        name: "Caroline Felix",
        img: "/person-5.svg",
        message: `
        No complaints!
Probably our fav purchase this year.
I also recommended a friend to you as well.
They just moved to Lagos so when they're ready, they will reach out.
Thank you.`,
        rating: 4.5,
      },
      {
        name: "Moses Adebayo",
        img: "/person-6.svg",
        message: `Thank you for your time and assistance. I am happy I chose Juwon Electric. You are absolutely unbelievable. 😃😃🔥🔥😇`,
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
