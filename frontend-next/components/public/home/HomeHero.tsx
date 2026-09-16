import Image from "next/image";
import Link from "next/link";
import { CirclePlay } from "lucide-react";
import { routes, socials } from "@/lib/site";

/** Landing hero. Port of frontend/src/pages/Home/Header.jsx (MUI Box/Button → Tailwind). */
export default function HomeHero() {
  return (
    <header className="mx-auto max-w-[1200px] px-5">
      <div className="flex flex-wrap gap-16 overflow-x-visible md:flex-nowrap">
        <div className="order-1">
          <h1 className="inter-bold mb-8 text-center text-2xl text-header_color md:text-left md:text-4xl lg:text-5xl xl:text-[64px] xl:leading-[90px]">
            We are committed to providing excellent service
          </h1>

          <Image src="/curve_line.svg" alt="" width={487} height={34} />

          <p className="inter-medium my-5 text-center text-base leading-relaxed md:my-8 md:text-left md:text-lg">
            Let us brighten your daily life. We&apos;re dedicated to making a positive impact on our world, starting right
            here on Earth.
          </p>

          <div className="flex flex-wrap justify-center gap-2 md:justify-start md:gap-10">
            <Link
              href={routes.packages}
              className="inline-flex items-center rounded-full bg-brand-500 px-5 py-3 text-[15px] font-medium uppercase tracking-[0.46px] text-white transition-colors hover:bg-brand-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 md:px-7"
            >
              Shop now
            </Link>

            <a
              href={socials.tt}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs font-medium uppercase tracking-[0.4px] text-black transition-colors hover:bg-black/5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 md:text-sm"
            >
              <CirclePlay aria-hidden="true" className="h-5 w-5" />
              View us on TikTok
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </div>

        <div className="flex w-full items-start justify-center gap-0 md:order-1">
          <Image
            src="/header.svg"
            alt="Juwon Electric technician installing solar panels"
            width={609}
            height={589}
            priority
            className="-mt-5 w-[80%] md:w-max"
          />
          <Link
            className="rotate-infinite -mb-12 -ml-12 w-[50px] rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 lg:-ml-28 lg:w-fit"
            href={routes.contact}
          >
            <Image src="/circular.svg" alt="Get in touch" width={134} height={134} />
          </Link>
        </div>
      </div>
    </header>
  );
}
