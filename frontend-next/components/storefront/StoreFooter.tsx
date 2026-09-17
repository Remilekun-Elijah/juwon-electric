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

const footerLink = cn("inline-flex min-h-11 items-center rounded-sm text-sm md:min-h-0 text-slate-600 transition-colors hover:text-brand-700", storeFocus);

/** White footer with a top border: Shop / Company / Contact columns, newsletter, socials and ©. Server component. */
export default function StoreFooter({ settings }: { settings: StoreSettings }) {
  const { business, website } = settings;
  const phones = phoneNumbers(business.phone);
  const whatsapp = whatsappHref(website.whatsappNumber);

  return (
    <footer className="border-t border-slate-200 bg-white">
      {/* Extra bottom room on phones so the floating WhatsApp button never covers the last footer row. */}
      <div className={cn(storeContainer, "py-12 sm:py-16", whatsapp && "pb-24 sm:pb-16")}>
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Link href={storeRoutes.home} className={cn("inline-block rounded-md", storeFocus)}>
              <Image src="/logo.svg" alt={`${SITE_NAME} home`} width={88} height={62} className="h-12 w-auto" />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600">
              Inverters, lithium and tubular batteries and solar panels, designed and installed by our engineers in Lagos,
              so NEPA outages don’t stop your home or business.
            </p>
            <div className="mt-6 max-w-md">
              <h2 className="text-sm font-semibold text-slate-900">Get offers and maintenance tips</h2>
              <div className="mt-3">
                <StoreNewsletter />
              </div>
            </div>
          </div>

          <div className="grid gap-10 sm:grid-cols-3 lg:col-span-8">
            {columns.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{column.title}</h2>
                <ul className="mt-3 space-y-0 md:mt-4 md:space-y-3">
                  {column.links.map((link) => (
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
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Contact</h2>
              <address className="mt-4 space-y-3 text-sm not-italic text-slate-600">
                {phones.length > 0 && (
                  <div className="flex gap-2.5">
                    <Phone aria-hidden="true" className="mt-3.5 h-4 w-4 md:mt-0.5 shrink-0 text-brand-700" />
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
                  <Mail aria-hidden="true" className="mt-3.5 h-4 w-4 md:mt-0.5 shrink-0 text-brand-700" />
                  <a href={`mailto:${business.email}`} className={cn(footerLink, "break-all")}>
                    {business.email}
                  </a>
                </div>
                {whatsapp && (
                  <div className="flex gap-2.5">
                    <MessageCircle aria-hidden="true" className="mt-3.5 h-4 w-4 md:mt-0.5 shrink-0 text-brand-700" />
                    <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={footerLink}>
                      Chat on WhatsApp
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </div>
                )}
                <div className="flex gap-2.5">
                  <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                  <span>{business.address}</span>
                </div>
                {website.businessHours && (
                  <div className="flex gap-2.5">
                    <Clock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
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

        <div className="mt-12 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
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
                    "inline-flex min-h-11 items-center rounded-full border border-slate-200 px-4 text-sm font-medium text-slate-600 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 md:min-h-9",
                    storeFocus
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
