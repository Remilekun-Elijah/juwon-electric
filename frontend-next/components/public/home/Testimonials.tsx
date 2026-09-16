import Carousel from "@/components/public/Carousel";
import CustomChip from "@/components/public/CustomChip";
import Slider from "@/components/public/Slider";
import { reviews } from "@/lib/fallbacks";
import { cn } from "@/lib/cn";
import { sectionTitle, siteContainer } from "@/lib/publicStyles";

/** Port of frontend/src/pages/Home/Testimonials.jsx (react-responsive-carousel → Carousel). */
export default function Testimonials() {
  return (
    <section aria-labelledby="testimonials-title" className={cn(siteContainer, "mb-10 mt-24 md:mt-40")}>
      <CustomChip text="Testimonials" className="flex justify-center" />

      <h2
        id="testimonials-title"
        className={cn("mb-10 mt-8 px-2 text-center text-deep_red md:px-0 lg:mb-14 lg:mt-10", sectionTitle)}
      >
        Client testimonials
      </h2>

      <Carousel label="Client testimonials">
        {reviews.map((slide) => (
          <Slider data={slide} key={slide[0].name} />
        ))}
      </Carousel>
    </section>
  );
}
