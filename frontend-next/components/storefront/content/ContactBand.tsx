import { useId } from "react";
import Link from "next/link";
import { MessageSquare, Phone } from "lucide-react";
import BrandPanel from "@/components/storefront/BrandPanel";
import Reveal from "@/components/storefront/motion/Reveal";
import { buttonClasses } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { StoreSettings } from "@/lib/storefront/data";
import { contactTopicPath, primaryPhone, storeRoutes, telHref } from "@/lib/storefront/routes";
import { storeContainer, storePress, storeSection } from "@/lib/storefront/styles";
import BusinessDetails from "./BusinessDetails";

export type ContactBandProps = {
  business: StoreSettings["business"];
  title?: string;
  description?: string;
  /** Show phone, email and address beside the CTAs (home page). */
  showDetails?: boolean;
  /** Prefills the contact form topic. */
  topic?: string;
};

/** White-on-brand call to action: call an engineer or send a message, optionally with business details. Server component. */
export default function ContactBand({
  business,
  title = "Not sure what size you need?",
  description = "Tell us the appliances you want to keep running during outages. An engineer will recommend an inverter, battery and solar setup that fits your load and budget.",
  showDetails = false,
  topic,
}: ContactBandProps) {
  const phone = primaryPhone(business.phone);
  const headingId = useId();
  const messageHref = topic ? contactTopicPath(topic) : storeRoutes.contact;

  return (
    <section aria-labelledby={headingId} className={storeSection}>
      <Reveal className={storeContainer}>
        <BrandPanel className="px-5 py-10 sm:px-10 sm:py-12 lg:px-14">
          <div className={cn("grid gap-10", showDetails && "lg:grid-cols-2 lg:items-center")}>
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-100">Talk to us</p>
              <h2 id={headingId} className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                {title}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-brand-50/90">{description}</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                {phone && (
                  <a
                    href={telHref(phone)}
                    className={buttonClasses({
                      variant: "secondary",
                      size: "lg",
                      className: cn("bg-white text-brand-800 hover:bg-brand-50 focus-visible:ring-white focus-visible:ring-offset-brand-800", storePress),
                    })}
                  >
                    <Phone aria-hidden="true" />
                    <span className="tabular-nums">Call {phone}</span>
                  </a>
                )}
                <Link
                  href={messageHref}
                  className={buttonClasses({
                    variant: "outline",
                    size: "lg",
                    className: cn("border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white focus-visible:ring-white focus-visible:ring-offset-brand-800", storePress),
                  })}
                >
                  <MessageSquare aria-hidden="true" />
                  Send a message
                </Link>
              </div>
            </div>
            {showDetails && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
                <BusinessDetails business={business} tone="brand" />
              </div>
            )}
          </div>
        </BrandPanel>
      </Reveal>
    </section>
  );
}
