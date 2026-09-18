import type { Metadata } from "next";
import Image from "next/image";
import { Mail, MapPin, Phone } from "lucide-react";
import ContactForm from "@/components/public/contact/ContactForm";
import CustomChip from "@/components/public/CustomChip";
import Header from "@/components/public/Header";
import { FacebookIcon, InstagramIcon, TikTokIcon, XIcon } from "@/components/public/icons";
import { getPublicSettings } from "@/lib/api/public";
import { isr, readOr } from "@/lib/api/server";
import { cn } from "@/lib/cn";
import { siteContainer } from "@/lib/publicStyles";
import { contactFallback, routes, socials } from "@/lib/site";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Contact us",
  description: "Call, email or message Juwon Electric about solar, inverter and battery systems in Lagos and across Nigeria.",
  alternates: { canonical: routes.contact },
  openGraph: { url: routes.contact, title: "Contact us | Juwon Electric" },
};

// Social icon links: ~40px tap target; the negative margin cancels the padding so icons stay put.
const socialLink =
  "-m-2 inline-flex items-center justify-center rounded-md p-2 transition-opacity duration-150 hover:opacity-80 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500";

const socialLinks = [
  { href: socials.insta, label: "Instagram", Icon: InstagramIcon },
  { href: socials.fb, label: "Facebook", Icon: FacebookIcon },
  { href: socials.x, label: "X", Icon: XIcon },
  { href: socials.tt, label: "TikTok", Icon: TikTokIcon },
];

/** Port of frontend/src/pages/Contact.jsx. Business details come from `GET /settings/public` when available. */
export default async function ContactPage() {
  const settings = await readOr("GET /settings/public", () => getPublicSettings(isr(["settings"])), null);
  const business = settings.data?.business;
  const phone = business?.phone || contactFallback.phone;
  const email = business?.email || contactFallback.email;
  const address = business?.address || contactFallback.address;

  return (
    <>
      <Header text="CONTACT US" />

      <div className="bg-cover bg-center" style={{ backgroundImage: "url('/contactBackground.jpg')" }}>
        <div className={cn(siteContainer, "py-24")}>
          <CustomChip text="Contact Us" className="hidden justify-center py-10 md:flex" />
          <p className="inter-medium text-center text-base leading-relaxed text-faint">
            Have questions? Feel free to reach out to us via phone or email. We&apos;re here to assist you!
          </p>

          <section aria-labelledby="get-in-touch" className="mt-10 rounded-lg bg-white px-5 py-6 shadow-sm md:p-10">
            <div className="mb-5 flex justify-center lg:mb-16">
              <h2
                id="get-in-touch"
                className="sora-bold border-b-[3px] border-deep_red pb-1 text-center text-xl leading-snug text-deep_red max-lg:sr-only md:text-2xl lg:inline-block"
              >
                Get In Touch
              </h2>
            </div>

            <div className="flex w-full flex-wrap justify-around gap-10">
              <ContactForm />

              <address className="mt-5 not-italic text-[#555] lg:mt-0">
                <Image src="/getInTouch.svg" alt="" width={258} height={258} className="hidden lg:block" />
                <p className="flex gap-2">
                  <Phone aria-hidden="true" className="h-6 w-6 shrink-0 text-deep_red" fill="currentColor" />
                  <span className="sr-only">Phone: </span>
                  <span className="inter-regular text-base leading-6">{phone}</span>
                </p>
                <p className="my-4 flex gap-2">
                  <Mail aria-hidden="true" className="h-6 w-6 shrink-0 text-deep_red" />
                  <span className="sr-only">Email: </span>
                  <a href={`mailto:${email}`} className="inter-regular min-w-0 break-words text-base leading-6 hover:underline">
                    {email}
                  </a>
                </p>
                <p className="flex gap-2">
                  <MapPin aria-hidden="true" className="h-6 w-6 shrink-0 text-deep_red" />
                  <span className="sr-only">Address: </span>
                  <span className="inter-regular text-base leading-6">{address}</span>
                </p>

                <div className="mt-10 flex items-center justify-center gap-5 text-deep_red lg:mt-5 lg:justify-start">
                  {socialLinks.map(({ href, label, Icon }) => (
                    <a key={label} className={socialLink} target="_blank" rel="noopener noreferrer" href={href} aria-label={`${label} (opens in a new tab)`}>
                      <Icon />
                    </a>
                  ))}
                </div>
              </address>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
