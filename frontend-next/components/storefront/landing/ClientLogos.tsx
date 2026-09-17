import SiteImage from "@/components/public/SiteImage";
import SampleBadge from "@/components/storefront/SampleBadge";
import Section from "@/components/storefront/Section";
import type { Client } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { storeFocus } from "@/lib/storefront/styles";
import { isAllowedUrl } from "@/lib/validation";

/** Site paths and http(s) URLs only (LANDING_V1 §1.3); anything else is skipped. */
const logoSrc = (url: string) => {
  const value = (url || "").trim();
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return /^https?:\/\//i.test(value) ? value : "";
};

/**
 * "Trusted by" logo grid (LANDING_V1 §7.3): up to 6 per row, greyscale until hover or focus, alt text is the client
 * name. Logos with a safe website link out. Returns nothing without usable logos. Server component.
 */
export default function ClientLogos({ clients }: { clients: Client[] }) {
  const logos = clients.map((client) => ({ client, src: logoSrc(client.logoUrl) })).filter((item) => item.src);
  if (!logos.length) return null;
  const allSample = logos.every(({ client }) => client.sample);

  return (
    <Section
      eyebrow="Our clients"
      title="Trusted by homes and businesses across Lagos"
      actions={allSample ? <SampleBadge /> : undefined}
      className="pt-6 sm:pt-10"
    >
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {logos.map(({ client, src }) => {
          const website = client.website?.trim() || "";
          const href = website && isAllowedUrl(website) && /^https:\/\//i.test(website) ? website : "";
          const image = (
            <SiteImage
              src={src}
              alt={client.name}
              fill
              sizes="(min-width: 1024px) 180px, (min-width: 640px) 30vw, 45vw"
              className="object-contain p-4 opacity-70 grayscale transition duration-200 group-hover:opacity-100 group-hover:grayscale-0 group-focus-visible:opacity-100 group-focus-visible:grayscale-0"
            />
          );
          const frame = "group relative block aspect-[5/2] w-full overflow-hidden rounded-xl border border-slate-200 bg-white";
          return (
            <li key={client.id} className="relative min-w-0">
              {href ? (
                <a href={href} target="_blank" rel="noopener noreferrer" className={cn(frame, "transition-shadow hover:shadow-elev-3", storeFocus)}>
                  {image}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <div className={frame}>{image}</div>
              )}
              {client.sample && !allSample && <SampleBadge className="absolute right-2 top-2" />}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
