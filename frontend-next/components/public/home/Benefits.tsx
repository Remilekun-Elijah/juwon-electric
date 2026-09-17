import Image from "next/image";
import { sectionTitle, siteContainer } from "@/lib/publicStyles";
import { cn } from "@/lib/cn";

const options = [
  { title: "Affordable Price", subtitle: "Budget-friendly cost", img: "/price_tag.svg" },
  { title: "Eco Friendly", subtitle: "Environment sustainable product", img: "/energy.svg" },
  { title: "Low Maintenance", subtitle: "Effortless upkeep solution", img: "/maintenance.svg" },
];

/** Port of frontend/src/pages/Home/Benefits.jsx. */
export default function Benefits() {
  return (
    <section aria-labelledby="benefits-title" className={cn(siteContainer, "mx-auto px-5 lg:mb-20 lg:mt-36")}>
      <h2 id="benefits-title" className={cn("mb-10 mt-20 text-center text-deep_red", sectionTitle)}>
        Benefits of solar energy
      </h2>

      {/* justify-items (not place-items) so cards in a row stretch to the same height */}
      <ul className="grid justify-center gap-7 md:grid-cols-2 md:gap-x-5 lg:grid-cols-3 lg:justify-items-center lg:gap-10">
        {options.map((option) => (
          <li key={option.title} className="rounded-lg bg-offWhite p-5 shadow-sm lg:w-80 xl:w-96">
            <div className="flex h-full items-center gap-5">
              {/* fixed icon box so every title starts at the same x */}
              <Image src={option.img} alt="" width={56} height={56} className="h-14 w-14 shrink-0 object-contain" />
              <div>
                <p className="sora-semibold text-lg leading-snug text-deep_red md:text-2xl">{option.title}</p>
                <p className="manrope-medium mt-1 text-base leading-snug text-faint md:text-xl">{option.subtitle}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
