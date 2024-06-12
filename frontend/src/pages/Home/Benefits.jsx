import { Container } from "@mui/material";
import config from "../../utils/config";

const Benefits = () => {
  const options = [
    {
      title: "Affordable Price",
      subtitle: "Budget-friendly cost",
      img: "/price_tag.svg",
    },
    {
      title: "Eco Friendly",
      subtitle: "Environment sustainable product",
      img: "/energy.svg",
    },
    {
      title: "Low Maintenance",
      subtitle: "Effortless upkeep solution",
      img: "/maintenance.svg",
    },
  ];
  return (
    <Container
      maxWidth={config.padding.x}
      className="lg:mt-36 lg:mb-20 px-5 mx-auto"
    >
      <h1 className="text-deep_red lg:text-[40px] md:text-4xl text-2xl text-center mt-20 mb-10 inter-bold">
        Benefits of solar energy
      </h1>

      <div className="grid lg:place-items-center lg:grid-cols-3 justify-center md:grid-cols-2 md:gap-x-5  lg:gap-10 gap-7 m">
        {options.map((a, i) => (
          <div
            key={i}
            className="bg-offWhite p-5 shadow rounded-lg lg:w-80 xl:w-96"
          >
            <div className="flex gap-5">
              <img src={a.img} alt="" />
              <div>
                <p className="text-deep_red sora-semibold md:text-2xl text-lg">
                  {a.title}
                </p>
                <p className="text-faint manrope-medium md:text-xl text-base">
                  {a.subtitle}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
};

export default Benefits;
