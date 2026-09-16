import { Container } from "@mui/material";
import config from "../../utils/config";
import { sectionTitle } from "../../lib/publicStyles";

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
      <h1 className={`text-deep_red ${sectionTitle} text-center mt-20 mb-10`}>
        Benefits of solar energy
      </h1>

      {/* justify-items (not place-items) so cards in a row stretch to the same height */}
      <div className="grid lg:justify-items-center lg:grid-cols-3 justify-center md:grid-cols-2 md:gap-x-5 lg:gap-10 gap-7">
        {options.map((a) => (
          <div
            key={a.title}
            className="bg-offWhite p-5 shadow rounded-lg lg:w-80 xl:w-96"
          >
            <div className="flex items-center gap-5 h-full">
              {/* fixed icon box so every title starts at the same x */}
              <img src={a.img} alt="" width={56} height={56} className="w-14 h-14 shrink-0 object-contain" />
              <div>
                <p className="text-deep_red sora-semibold md:text-2xl text-lg leading-snug">
                  {a.title}
                </p>
                <p className="text-faint manrope-medium md:text-xl text-base leading-snug mt-1">
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
