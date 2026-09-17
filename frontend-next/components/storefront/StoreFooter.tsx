import Image from "next/image";
import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { cn } from "@/lib/cn";
import { SITE_NAME, socials } from "@/lib/site";
import type { StoreSettings } from "@/lib/storefront/data";
import { phoneNumbers, storeRoutes, telHref, whatsappHref } from "@/lib/storefront/routes";
import { storeContainer, storeFocus } from "@/lib/storefront/styles";
import StoreNewsletter from "./StoreNewsletter";

const columns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Shop",
    links: [
      { label: "Inverter and solar packages", href: storeRoutes.packages },
      { label: "Products", href: storeRoutes.products },
      { label: "Load calculator", href: storeRoutes.calculator },
      { label: "Your cart", href: storeRoutes.cart },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Services", href: storeRoutes.services },
      { label: "Our work", href: storeRoutes.portfolio },
      { label: "Meet the team", href: storeRoutes.team },
      { label: "Careers", href: storeRoutes.vacancies },
      { label: "FAQ", href: storeRoutes.faq },
      { label: "Contact us", href: storeRoutes.contact },
    ],
  },
];

const socialLinks = [
  { label: "Facebook", href: socials.fb },
  { label: "Instagram", href: socials.insta },
  { label: "TikTok", href: socials.tt },
  { label: "X", href: socials.x },
];

/** Focus ring for the dark footer. */
const darkFocus = cn(storeFocus, "focus-visible:ring-gold-400 focus-visible:ring-offset-slate-950");
const footerLink = cn("inline-flex min-h-11 items-center rounded-sm text-sm md:min-h-0 text-white/70 transition-colors hover:text-gold-300", darkFocus);
const columnTitle = "text-xs font-semibold uppercase tracking-[0.14em] text-white/50";
const contactIcon = "h-4 w-4 shrink-0 text-gold-400";

/**
 * Dark slate-950 footer (TEAM_AND_MOTION_V1 §7.5): Shop / Company / Contact columns, newsletter, socials and ©, with
 * white/70 text and gold hover links. The logo sits on a white chip so its colours stay legible. Server component.
 */
export default function StoreFooter({ settings }: { settings: StoreSettings }) {
  const { business, website } = settings;
  const phones = phoneNumbers(business.phone);
  const whatsapp = whatsappHref(website.whatsappNumber);

  return (
    <footer className="bg-slate-950 text-white/70">
      {/* Extra bottom room on phones so the floating action circles never cover the last footer row. */}
      <div className={cn(storeContainer, "py-12 sm:py-16", (whatsapp || settings.calculator) && "pb-40 sm:pb-20")}>
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Link href={storeRoutes.home} className={cn("inline-block rounded-xl bg-white px-3 py-2", darkFocus)}>
              <Image src="/logo.svg" alt={`${SITE_NAME} home`} width={88} height={62} className="h-10 w-auto" />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
              Inverters, lithium and tubular batteries and solar panels, designed and installed by our engineers in Lagos,
              so NEPA outages don’t stop your home or business.
            </p>
            <div className="mt-6 max-w-md">
              <h2 className="text-sm font-semibold text-white">Get offers and maintenance tips</h2>
              <div className="mt-3">
                <StoreNewsletter tone="dark" />
              </div>
            </div>
          </div>

          <div className="grid gap-10 sm:grid-cols-3 lg:col-span-8">
            {columns.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h2 className={columnTitle}>{column.title}</h2>
                <ul className="mt-3 space-y-0 md:mt-4 md:space-y-3">
                  {column.links.filter((link) => settings.calculator || link.href !== storeRoutes.calculator).map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className={footerLink}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}

            <div>
              <h2 className={columnTitle}>Contact</h2>
              <address className="mt-4 space-y-3 text-sm not-italic text-white/70">
                {phones.length > 0 && (
                  <div className="flex gap-2.5">
                    <Phone aria-hidden="true" className={cn(contactIcon, "mt-3.5 md:mt-0.5")} />
                    <ul className="md:space-y-1">
                      {phones.map((phone) => (
                        <li key={phone}>
                          <a href={telHref(phone)} className={cn(footerLink, "tabular-nums")}>
                            {phone}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex gap-2.5">
                  <Mail aria-hidden="true" className={cn(contactIcon, "mt-3.5 md:mt-0.5")} />
                  <a href={`mailto:${business.email}`} className={cn(footerLink, "break-all")}>
                    {business.email}
                  </a>
                </div>
                {whatsapp && (
                  <div className="flex gap-2.5">
                    <MessageCircle aria-hidden="true" className={cn(contactIcon, "mt-3.5 md:mt-0.5")} />
                    <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={footerLink}>
                      Chat on WhatsApp
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </div>
                )}
                <div className="flex gap-2.5">
                  <MapPin aria-hidden="true" className={cn(contactIcon, "mt-0.5")} />
                  <span>{business.address}</span>
                </div>
                {website.businessHours && (
                  <div className="flex gap-2.5">
                    <Clock aria-hidden="true" className={cn(contactIcon, "mt-0.5")} />
                    <p className="whitespace-pre-line">
                      <span className="sr-only">Opening hours: </span>
                      {website.businessHours}
                    </p>
                  </div>
                )}
              </address>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/60">
            © {new Date().getFullYear()} {business.name || SITE_NAME}. All rights reserved.
          </p>
          <ul aria-label="Social media" className="flex flex-wrap gap-2">
            {socialLinks.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-full border border-white/15 px-4 text-sm font-medium text-white/70 transition-colors hover:border-gold-400/60 hover:bg-white/5 hover:text-gold-300 md:min-h-9",
                    darkFocus
                  )}
                >
                  {social.label}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
