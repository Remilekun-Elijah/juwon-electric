import { useMemo, useState } from "react";
import { Container } from "@mui/material";
import Tab from "../../components/Tab";
import CustomChip from "../../components/CustomChip";
import { whatDrivesUs } from "../../utils/helper";

const About = () => {
  const [active, setActive] = useState(0);

  const about = useMemo(() => {
    return whatDrivesUs[active];
  }, [active]);

  return (
    <section className="energyBackground flex items-center justify-between lg:pb-20 lg:pt-0 py-20">
      <Container maxWidth="lg" className="relative">
        <div className="flex flex-col lg:flex-row items-center justify-center lg:flex-nowrap flex-wrap">
          <img src="/engineer.svg" className="z-10 lg:ml-0" />

          <div className="lg:-ml-10 max-w-[700px] lg:mt- -mt-4 lg:mt-60 z-10 div p-5 bg-offWhite rounded-lg shadow-lg w-full lg:min-h-[500px] md:min-h-[450px] h-full">
            <CustomChip
              text="About Us"
              className="md:mb-16 mb-10 mt-5 md:mt-10 lg:mt-5 lg:block flex justify-center"
            />

            <h2 className="sora-bold text-center lg:text-left mb-5 text-deep_red lg:text-[40px] md:text-4xl text-2xl">
              Juwon Electric
            </h2>
            <div>
              <Tab
                {...{ active, setActive }}
                navMenu={["Our Mission", "Our Vision", "Quality Assurance"]}
              />
            </div>
            <p className="text-base lg:text-left text-justify mt-5 inter-medium text-faint">
              {about}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default About;
