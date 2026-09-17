"use client";

import Image from "next/image";
import { useState } from "react";
import CustomChip from "@/components/public/CustomChip";
import Tab from "@/components/public/Tab";
import { whatDrivesUs } from "@/lib/fallbacks";
import { cn } from "@/lib/cn";
import { sectionTitle } from "@/lib/publicStyles";

const tabs = ["Our Mission", "Our Vision", "Quality Assurance"];

/** Port of frontend/src/pages/Home/About.jsx. */
export default function About() {
  const [active, setActive] = useState(0);

  return (
    <section
      id="about"
      aria-labelledby="about-title"
      className="energyBackground flex items-center justify-between py-20 lg:pb-20 lg:pt-0"
    >
      <div className="relative mx-auto w-full max-w-[1200px] px-4 sm:px-6">
        <div className="flex flex-col flex-wrap items-center justify-center lg:flex-row lg:flex-nowrap">
          <Image
            src="/engineer.svg"
            alt="Juwon Electric engineer"
            width={597}
            height={577}
            className="z-10 shadow-sm lg:ml-0"
          />

          <div className="z-10 -mt-4 h-full w-full max-w-[700px] rounded-lg bg-offWhite p-5 shadow-lg md:min-h-[450px] lg:-ml-10 lg:mt-60 lg:min-h-[500px]">
            <CustomChip text="About Us" className="mb-8 mt-5 flex justify-center md:mb-10 md:mt-10 lg:mt-5 lg:block" />

            <h2 id="about-title" className={cn(sectionTitle, "mb-6 text-center text-deep_red lg:text-left")}>
              Juwon Electric
            </h2>
            <Tab id="about" active={active} setActive={setActive} navMenu={tabs} />
            <p
              id="about-panel"
              role="tabpanel"
              aria-labelledby={`about-tab-${active}`}
              className="inter-medium mt-6 hyphens-auto text-justify text-sm leading-relaxed text-faint md:text-base lg:hyphens-manual lg:text-left"
            >
              {whatDrivesUs[active]}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
