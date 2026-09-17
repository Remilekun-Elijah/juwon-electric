import type { Metadata } from "next";
import Link from "next/link";
import { MoveRight } from "lucide-react";
import Carousel from "@/components/public/Carousel";
import CustomChip from "@/components/public/CustomChip";
import Header from "@/components/public/Header";
import SiteImage from "@/components/public/SiteImage";
import { getServices } from "@/lib/api/public";
import { isr, readOr } from "@/lib/api/server";
import { cn } from "@/lib/cn";
import { fallbackCustomers, fallbackOfferings } from "@/lib/fallbacks";
import { buttonBase, buttonHover, cardTitle, sectionTitle, siteContainer } from "@/lib/publicStyles";
import { routes } from "@/lib/site";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Our services",
  description:
    "System design, energy audits, lighting solutions, after-sales service and maintenance for solar and inverter systems across Nigeria.",
  alternates: { canonical: routes.services },
  openGraph: { url: routes.services, title: "Our services | Juwon Electric" },
};

/** Port of frontend/src/pages/Services/Services.jsx. */
export default async function ServicesPage() {
  const services = await readOr(
    "GET /services",
    () => getServices(isr(["services"])),
    { offerings: fallbackOfferings, customerSegments: fallbackCustomers }
  );
  // Vite falls back per list when a list is empty.
  const offerings = services.data.offerings?.length ? services.data.offerings : fallbackOfferings;
  const customers = services.data.customerSegments?.length ? services.data.customerSegments : fallbackCustomers;

  return (
    <>
      <Header text="OUR SERVICES" />

      <div className="energyBackground py-20">
        <div className={siteContainer}>
          <CustomChip text="What we offer" className="my-10 flex justify-center" />

          <p className="inter-medium mx-auto max-w-4xl text-center text-base leading-relaxed text-faint md:mb-20">
            Our Mission is to provide uninterrupted electric power to every Nigerian through clean renewable energy.
            Below is a list of service we offer our customers
          </p>

          <section aria-label="What we offer" className="mt-10 grid justify-center gap-10 md:grid-cols-2 xl:grid-cols-3 xl:gap-16">
            {offerings.map((offering) => (
              <article key={offering.id ?? offering.title} className="flex flex-col rounded-lg bg-white px-6 pb-6 pt-5 shadow-md">
                {/* Same-height illustration box so titles line up across cards. */}
                <div className="mb-8 flex items-end justify-center md:h-44">
                  {offering.image && (
                    <SiteImage
                      src={offering.image}
                      alt=""
                      width={320}
                      height={176}
                      className="max-h-44 w-auto object-contain"
                    />
                  )}
                </div>

                <h2 className={cn("mb-4 text-center text-deep_red md:text-left", cardTitle)}>{offering.title}</h2>
                <p className="inter-medium mb-4 hyphens-auto whitespace-pre-line text-justify text-base leading-relaxed text-faint md:hyphens-manual md:text-left">
                  {offering.subtitle.trim()}
                </p>
                <Link
                  className="mt-auto inline-flex min-h-[40px] items-center gap-1 self-start rounded-sm text-faint underline-offset-4 hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
                  href={offering.ctaUrl || routes.packages}
                >
                  {offering.ctaLabel || "Let’s go"} <MoveRight aria-hidden="true" className="h-6 w-6" />
                  <span className="sr-only"> — {offering.title}</span>
                </Link>
              </article>
            ))}
          </section>
        </div>
      </div>

      <section aria-labelledby="customers-title" className="my-5">
        <div className={cn(siteContainer, "pb-20 pt-10")}>
          <h2 id="customers-title" className={cn("mb-10 mt-8 text-center text-deep_red lg:mb-14 lg:mt-10", sectionTitle)}>
            Our Customers
          </h2>

          <Carousel label="Our customers">
            {customers.map((customer) => (
              <div key={customer.id ?? customer.title} className="h-full">
                <div className="flex h-full flex-wrap justify-center lg:flex-nowrap">
                  <div className="order-1 -mt-12 w-full rounded-t-xl bg-offWhite px-6 pb-16 pt-10 md:mt-0 lg:w-[700px] lg:pb-10">
                    <h3 className={cn("my-5 text-deep_red", cardTitle)}>{customer.title}</h3>
                    <p className="inter-medium mb-10 text-faint leading-relaxed">{customer.subtitle}</p>
                    <Link href={routes.contact} className={cn(buttonBase, buttonHover, "cursor-pointer bg-brand-500 text-white")}>
                      Contact us
                    </Link>
                  </div>

                  {customer.image && (
                    <SiteImage
                      src={customer.image}
                      alt=""
                      width={700}
                      height={400}
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      className="h-[400px] w-full object-cover lg:order-1"
                    />
                  )}
                </div>
              </div>
            ))}
          </Carousel>
        </div>
      </section>
    </>
  );
}
