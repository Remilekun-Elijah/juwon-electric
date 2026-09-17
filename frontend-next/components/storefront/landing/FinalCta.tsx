import { useId } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import BrandPanel from "@/components/storefront/BrandPanel";
import Reveal from "@/components/storefront/motion/Reveal";
import { buttonClasses } from "@/components/ui";
import { cn } from "@/lib/cn";
import { phoneNumbers, primaryPhone, storeRoutes, telHref, whatsappHref } from "@/lib/storefront/routes";
import { storeArrowNudge, storeContainer, storeFocus, storePress, storeSection } from "@/lib/storefront/styles";

export type FinalCtaProps = {
  phone: string;
  /** Business email and address, shown under the buttons so the home page keeps full contact details. */
  email?: string | null;
  address?: string | null;
  whatsappNumber: string | null;
  businessHours?: string | null;
};

const onBrand = "focus-visible:ring-white focus-visible:ring-offset-brand-800";
const detailLink = cn("inline-flex min-h-11 items-center gap-2 rounded-sm text-brand-50 underline-offset-4 hover:text-gold-300 hover:underline md:min-h-0", storeFocus, onBrand);

/**
 * Closing call to action on the brand panel (LANDING_V1 §7.13) over one of our installation photos, with a gold primary
 * button (TEAM_AND_MOTION_V1 §7.5): Shop packages, Call, and WhatsApp when set, then the business phone numbers, email,
 * address and opening hours (the home page has no separate contact band). Server component.
 */
export default function FinalCta({ phone, email, address, whatsappNumber, businessHours }: FinalCtaProps) {
  const headingId = useId();
  const mainPhone = primaryPhone(phone);
  const phones = phoneNumbers(phone);
  const mail = email?.trim() || "";
  const place = address?.trim() || "";
  const whatsapp = whatsappHref(whatsappNumber);

  return (
    <section aria-labelledby={headingId} className={storeSection}>
      <Reveal className={storeContainer}>
        <BrandPanel ring="bottom-left" className="px-5 py-12 text-center shadow-elev-4 sm:px-10 sm:py-16 lg:px-14">
          <Image src="/panel-6.webp" alt="" fill sizes="(min-width: 1280px) 1216px, 100vw" className="-z-20 object-cover" />
          <div aria-hidden="true" className="absolute inset-0 -z-20 bg-gradient-to-br from-brand-900/95 via-brand-800/90 to-brand-700/80" />
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-400">Ready when you are</p>
          <h2 id={headingId} className="mx-auto mt-2 max-w-2xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl lg:text-4xl">
            Keep your lights on through every outage
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-brand-50/90">
            Choose a package online or talk to an engineer. There’s nothing to pay when you place an order: we call you to confirm first.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={storeRoutes.packages}
              className={buttonClasses({
                variant: "secondary",
                size: "lg",
                className: cn("group border-transparent bg-gold-400 text-slate-950 hover:bg-gold-300 hover:text-slate-950", onBrand, storePress),
              })}
            >
              Shop packages
              <ArrowRight aria-hidden="true" className={storeArrowNudge} />
            </Link>
            {mainPhone && (
              <a
                href={telHref(mainPhone)}
                className={buttonClasses({
                  variant: "outline",
                  size: "lg",
                  className: cn("border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white", onBrand, storePress),
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
                  className: cn("border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white", onBrand, storePress),
                })}
              >
                <MessageCircle aria-hidden="true" />
                Chat on WhatsApp
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
          </div>
          {(phones.length > 0 || mail || place) && (
            <address className="mx-auto mt-8 flex max-w-3xl flex-col items-center gap-x-6 gap-y-1 border-t border-white/10 pt-6 text-sm not-italic md:flex-row md:flex-wrap md:justify-center md:gap-y-2">
              {phones.map((number) => (
                <a key={number} href={telHref(number)} className={detailLink}>
                  <Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-gold-400" />
                  <span className="tabular-nums">{number}</span>
                </a>
              ))}
              {mail && (
                <a href={`mailto:${mail}`} className={cn(detailLink, "break-all")}>
                  <Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-gold-400" />
                  {mail}
                </a>
              )}
              {place && (
                <span className="inline-flex min-h-11 items-center gap-2 text-brand-50 md:min-h-0">
                  <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-gold-400" />
                  {place}
                </span>
              )}
            </address>
          )}
          {businessHours && (
            <p className="mx-auto mt-4 max-w-md whitespace-pre-line text-sm text-brand-100/90">
              <span className="font-medium text-white">Opening hours: </span>
              {businessHours}
            </p>
          )}
        </BrandPanel>
      </Reveal>
    </section>
  );
}
