import Image from "next/image";
import { Star, StarHalf, UserRound } from "lucide-react";
import type { Review } from "@/lib/fallbacks";

/** Stars for a 4, 4.5 or 5 rating, as the Vite Slider draws them. */
function Rating({ rating }: { rating: number }) {
  return (
    <p className="flex text-[#EAC157]" aria-label={`Rated ${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => {
        const last = i === 4;
        if (last && rating === 4.5) return <StarHalf key={i} aria-hidden="true" className="h-6 w-6" fill="currentColor" />;
        if (last && rating === 4) return <Star key={i} aria-hidden="true" className="h-6 w-6" />;
        return <Star key={i} aria-hidden="true" className="h-6 w-6" fill="currentColor" />;
      })}
    </p>
  );
}

/** One testimonial slide (two reviews). Port of frontend/src/components/Slider.jsx. */
export default function Slider({ data = [] }: { data: Review[] }) {
  return (
    <div className="my-10 flex flex-wrap justify-center gap-10 pb-10">
      {data.map((review) => (
        <figure key={review.name} className="flex w-full flex-col md:max-w-[500px] xl:max-w-[550px]">
          {/* flex-1/h-full: cards in the same slide share one height. */}
          <div className="relative flex-1">
            <div className="z-20 h-full bg-offWhite px-5 shadow-sm">
              <blockquote className="relative z-20 mb-0 flex h-full flex-col border-l-[5px] border-deep_red p-5">
                <Image src="/quote.svg" alt="" width={48} height={48} className="mb-5 w-12" />
                <p className="inter-medium whitespace-pre-line text-left text-base leading-relaxed text-faint">
                  {review.message.trim()}
                </p>
              </blockquote>
            </div>
            <div className="arrow-down absolute z-10 shadow-sm" aria-hidden="true" />
          </div>
          <figcaption className="ml-9 mt-14 flex items-center gap-4 sm:ml-10">
            <span className="z-20 grid h-16 w-16 place-items-center rounded-full bg-[#bdbdbd] text-white" aria-hidden="true">
              <UserRound className="h-10 w-10" fill="currentColor" />
            </span>
            <div className="text-left">
              <p>{review.name}</p>
              <Rating rating={review.rating} />
            </div>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
