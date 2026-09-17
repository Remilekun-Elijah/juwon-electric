import { ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import { cn } from "@/lib/cn";
import type { StoreSettings } from "@/lib/storefront/data";
import { phoneNumbers, telHref } from "@/lib/storefront/routes";
import { storeFocus, storeLink } from "@/lib/storefront/styles";

/** Google Maps search for a free-text address. */
export const mapsSearchHref = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

export type BusinessDetailsProps = {
  business: StoreSettings["business"];
  /** `light` for white cards, `brand` for text on the brand panel. */
  tone?: "light" | "brand";
  className?: string;
};

/**
 * Phone numbers (tel links), email (mailto) and address (Google Maps search) from public settings, as an `<address>`
 * definition list. No opening hours: they aren't in settings. Server component.
 */
export default function BusinessDetails({ business, tone = "light", className }: BusinessDetailsProps) {
  const phones = phoneNumbers(business.phone);
  const brand = tone === "brand";
  const iconWrap = cn(
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
    brand ? "bg-white/10 text-white" : "bg-brand-50 text-brand-700"
  );
  const label = cn("text-xs font-semibold uppercase tracking-[0.14em]", brand ? "text-brand-100" : "text-slate-500");
  const link = brand
    ? cn("rounded-sm font-medium text-white underline-offset-4 hover:underline", storeFocus, "focus-visible:ring-white focus-visible:ring-offset-brand-800")
    : storeLink;

  return (
    <address className={cn("not-italic", className)}>
      <dl className="space-y-5">
        {phones.length > 0 && (
          <div className="flex gap-3">
            <span className={iconWrap}>
              <Phone aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <dt className={label}>{phones.length > 1 ? "Phone numbers" : "Phone"}</dt>
              <dd className="mt-1">
                <ul className="flex flex-col">
                  {phones.map((phone) => (
                    <li key={phone}>
                      <a href={telHref(phone)} className={cn(link, "inline-flex min-h-11 items-center tabular-nums md:min-h-7")}>
                        {phone}
                      </a>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <span className={iconWrap}>
            <Mail aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <dt className={label}>Email</dt>
            <dd className="mt-1">
              <a href={`mailto:${business.email}`} className={cn(link, "inline-flex min-h-11 items-center break-all md:min-h-7")}>
                {business.email}
              </a>
            </dd>
          </div>
        </div>
        <div className="flex gap-3">
          <span className={iconWrap}>
            <MapPin aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <dt className={label}>Address</dt>
            <dd className={cn("mt-1", brand ? "text-white" : "text-slate-700")}>
              <span className="block">{business.address}</span>
              <a
                href={mapsSearchHref(business.address)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(link, "mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm md:min-h-7")}
              >
                Open in Google Maps
                <ExternalLink aria-hidden="true" className="h-4 w-4" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </dd>
          </div>
        </div>
      </dl>
    </address>
  );
}
