import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  XIcon,
  YouTubeIcon,
} from "@/components/public/icons";
import { cn } from "@/lib/cn";
import { SITE_NAME, socials } from "@/lib/site";
import type { StoreSettings } from "@/lib/storefront/data";
import {
  phoneNumbers,
  storeRoutes,
  telHref,
  whatsappHref,
} from "@/lib/storefront/routes";
import { storeContainer, storeFocus } from "@/lib/storefront/styles";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Reveal from "./motion/Reveal";
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
      { label: "Projects", href: storeRoutes.portfolio },
      { label: "Our Team", href: storeRoutes.team },
      { label: "Careers", href: storeRoutes.vacancies },
      { label: "FAQ", href: storeRoutes.faq },
      { label: "Contact us", href: storeRoutes.contact },
    ],
  },
];

const socialLinks = [
  { label: "Facebook", href: socials.fb, Icon: FacebookIcon },
  { label: "Instagram", href: socials.insta, Icon: InstagramIcon },
  { label: "TikTok", href: socials.tt, Icon: TikTokIcon },
  { label: "X", href: socials.x, Icon: XIcon },
  { label: "YouTube", href: socials.yt, Icon: YouTubeIcon },
];

/** Hides links to areas switched off in Settings (Load calculator, Products). */
const shown = (href: string, settings: StoreSettings) =>
  (settings.calculator || href !== storeRoutes.calculator) &&
  (settings.website.productsEnabled || href !== storeRoutes.products);

/** Focus ring for the dark footer. */
const darkFocus = cn(
  storeFocus,
  "focus-visible:ring-gold-400 focus-visible:ring-offset-brand-950",
);
const footerLink = cn(
  "inline-flex min-h-11 items-center rounded-sm text-sm md:min-h-0 text-white/70 transition-colors hover:text-gold-300",
  darkFocus,
);
const columnTitle =
  "text-xs font-semibold uppercase tracking-[0.14em] text-white/50";
const contactIcon = "h-4 w-4 shrink-0 text-gold-400";

/**
 * Dark brand-950 footer (TEAM_AND_MOTION_V1 §7.5): Shop / Company / Contact columns, newsletter, socials and ©, with
 * white/70 text and gold hover links. Server component.
 *
 * Motion: the brand column slides in from the left, the link and contact columns follow one after another (sliding in
 * alternately from each side on phones), and the bottom bar fades in with the social pills popping in one by one.
 */
export default function StoreFooter({ settings }: { settings: StoreSettings }) {
  const { business, website } = settings;
  const phones = phoneNumbers(business.phone);
  const whatsapp = whatsappHref(website.whatsappNumber);

  return (
    <footer className="bg-brand-950 text-white/70">
      {/* Extra bottom room on phones so the floating action circles never cover the last footer row. */}
      <div
        className={cn(
          storeContainer,
          "py-12 sm:py-16",
          (whatsapp || settings.calculator) && "pb-40 sm:pb-20",
        )}
      >
        <div className="grid gap-10 lg:grid-cols-12">
          <Reveal from="left" className="lg:col-span-4">
            {/* 2026-09-19: no white chip behind the logo; the gold mark reads on the brand-950 footer. */}
            <Link
              href={storeRoutes.home}
              className={cn(
                "-ml-1 inline-block rounded-xl px-1 py-1",
                darkFocus,
              )}
            >
              <Image
                src="/logo.svg"
                alt={`${SITE_NAME} home`}
                width={88}
                height={62}
                className="h-10 w-auto"
              />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
              Reliable solar solutions including inverters, lithium batteries,
              solar panels and complete energy systems — professionally designed
              and installed by our engineering team.
            </p>
            <div className="mt-6 max-w-md">
              <h2 className="text-sm font-semibold text-white">Stay Updated</h2>
              <p className="mt-1 text-sm leading-relaxed text-white/70 hidden">
                Get exclusive offers, solar tips and important updates from
                Juwon Electric.
              </p>
              <div className="mt-3">
                <StoreNewsletter tone="dark" />
              </div>
            </div>
          </Reveal>

          <Reveal
            stagger
            staggerStep={90}
            className="grid gap-10 sm:grid-cols-3 lg:col-span-8"
          >
            {columns.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h2 className={columnTitle}>{column.title}</h2>
                <ul className="mt-3 space-y-0 md:mt-4 md:space-y-3">
                  {column.links
                    .filter((link) => shown(link.href, settings))
                    .map((link) => (
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
                    <Phone
                      aria-hidden="true"
                      className={cn(contactIcon, "mt-3.5 md:mt-0.5")}
                    />
                    <ul className="md:space-y-1">
                      {phones.map((phone) => (
                        <li key={phone}>
                          <a
                            href={telHref(phone)}
                            className={cn(footerLink, "tabular-nums")}
                          >
                            {phone}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex gap-2.5">
                  <Mail
                    aria-hidden="true"
                    className={cn(contactIcon, "mt-3.5 md:mt-0.5")}
                  />
                  <a
                    href={`mailto:${business.email}`}
                    className={cn(footerLink, "break-all")}
                  >
                    {business.email}
                  </a>
                </div>
                {whatsapp && (
                  <div className="flex gap-2.5">
                    <MessageCircle
                      aria-hidden="true"
                      className={cn(contactIcon, "mt-3.5 md:mt-0.5")}
                    />
                    <a
                      href={whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={footerLink}
                    >
                      Chat on WhatsApp
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </div>
                )}
                <div className="flex gap-2.5">
                  <MapPin
                    aria-hidden="true"
                    className={cn(contactIcon, "mt-0.5")}
                  />
                  <span>{business.address}</span>
                </div>
                {website.businessHours && (
                  <div className="flex gap-2.5">
                    <Clock
                      aria-hidden="true"
                      className={cn(contactIcon, "mt-0.5")}
                    />
                    <p className="whitespace-pre-line">
                      <span className="sr-only">Opening hours: </span>
                      {website.businessHours}
                    </p>
                  </div>
                )}
              </address>
            </div>
          </Reveal>
        </div>

        <Reveal
          from="fade"
          className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-white/60">
            © {new Date().getFullYear()} {business.name || SITE_NAME}. All
            rights reserved.
          </p>
          <Reveal
            as="ul"
            stagger
            from="zoom"
            delay={150}
            aria-label="Social media"
            className="flex flex-wrap gap-2"
          >
            {socialLinks.map(({ label, href, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${label} (opens in a new tab)`}
                  className={cn(
                    // Phones: a round icon button. From sm: the name, as before.
                    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/15 text-sm font-medium text-white/70 transition-colors hover:border-gold-400/60 hover:bg-white/5 hover:text-gold-300 sm:min-w-0 sm:px-4 md:min-h-9",
                    darkFocus,
                  )}
                >
                  <Icon size={18} className="sm:hidden" />
                  <span className="hidden sm:inline">{label}</span>
                </a>
              </li>
            ))}
          </Reveal>
        </Reveal>
      </div>
    </footer>
  );
}
