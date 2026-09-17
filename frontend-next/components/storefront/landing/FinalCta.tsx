import { useId } from "react";
import Link from "next/link";
import { ArrowRight, MessageCircle, Phone } from "lucide-react";
import BrandPanel from "@/components/storefront/BrandPanel";
import { buttonClasses } from "@/components/ui";
import { cn } from "@/lib/cn";
import { primaryPhone, storeRoutes, telHref, whatsappHref } from "@/lib/storefront/routes";
import { storeContainer, storeFadeUp, storeSection } from "@/lib/storefront/styles";

export type FinalCtaProps = {
  phone: string;
  whatsappNumber: string | null;
  businessHours?: string | null;
};

const onBrand = "focus-visible:ring-white focus-visible:ring-offset-brand-800";

/** Closing call to action on the brand panel (LANDING_V1 §7.13): Shop packages, Call, and WhatsApp when set. Server component. */
export default function FinalCta({ phone, whatsappNumber, businessHours }: FinalCtaProps) {
  const headingId = useId();
  const mainPhone = primaryPhone(phone);
  const whatsapp = whatsappHref(whatsappNumber);

  return (
    <section aria-labelledby={headingId} className={storeSection}>
      <div className={cn(storeContainer, storeFadeUp)}>
        <BrandPanel ring="bottom-left" className="px-5 py-10 text-center sm:px-10 sm:py-14 lg:px-14">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-100">Ready when you are</p>
          <h2 id={headingId} className="mx-auto mt-2 max-w-2xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl lg:text-4xl">
            Keep your lights on through every outage
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-brand-50/90">
            Choose a package online or talk to an engineer. There’s nothing to pay when you place an order: we call you to confirm first.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={storeRoutes.packages}
              className={buttonClasses({ variant: "secondary", size: "lg", className: cn("bg-white text-brand-800 hover:bg-brand-50", onBrand) })}
            >
              Shop packages
              <ArrowRight aria-hidden="true" />
            </Link>
            {mainPhone && (
              <a
                href={telHref(mainPhone)}
                className={buttonClasses({
                  variant: "outline",
                  size: "lg",
                  className: cn("border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white", onBrand),
                })}
              >
                <Phone aria-hidden="true" />
                <span className="tabular-nums">Call {mainPhone}</span>
              </a>
            )}
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({
                  variant: "outline",
                  size: "lg",
                  className: cn("border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white", onBrand),
                })}
              >
                <MessageCircle aria-hidden="true" />
                Chat on WhatsApp
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
          </div>
          {businessHours && (
            <p className="mx-auto mt-6 max-w-md whitespace-pre-line text-sm text-brand-100/90">
              <span className="font-medium text-white">Opening hours: </span>
              {businessHours}
            </p>
          )}
        </BrandPanel>
      </div>
    </section>
  );
}
