import SiteImage from "@/components/public/SiteImage";
import SampleBadge from "@/components/storefront/SampleBadge";
import Section from "@/components/storefront/Section";
import Reveal from "@/components/storefront/motion/Reveal";
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

/** Logos per row in the static grid at `lg`. More than this scrolls at every width. */
const DESKTOP_ROW = 6;
/** With fewer logos than this, the phone grid (2 per row) is short enough to stay static. */
const MIN_MARQUEE = 3;

type Logo = { client: Client; src: string };

function LogoTile({ client, src, allSample, duplicate = false }: Logo & { allSample: boolean; duplicate?: boolean }) {
  const website = client.website?.trim() || "";
  const href = website && isAllowedUrl(website) && /^https:\/\//i.test(website) ? website : "";
  const image = (
    <SiteImage
      src={src}
      alt={duplicate ? "" : client.name}
      fill
      sizes="(min-width: 1024px) 180px, 176px"
      className="object-contain p-4 opacity-70 grayscale transition duration-200 group-hover:opacity-100 group-hover:grayscale-0 group-focus-visible:opacity-100 group-focus-visible:grayscale-0"
    />
  );
  const frame = "group relative block aspect-[5/2] w-full overflow-hidden rounded-xl border border-slate-200 bg-white";
  return (
    <>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={duplicate ? -1 : undefined}
          className={cn(frame, "transition-shadow hover:shadow-elev-3", storeFocus)}
        >
          {image}
          {!duplicate && <span className="sr-only"> (opens in a new tab)</span>}
        </a>
      ) : (
        <div className={frame}>{image}</div>
      )}
      {client.sample && !allSample && <SampleBadge className="absolute right-2 top-2" />}
    </>
  );
}

/**
 * "Trusted by" logos (LANDING_V1 §7.3, TEAM_AND_MOTION_V1 §5.4): greyscale until hover or focus, alt text is the client
 * name, safe websites link out. Returns nothing without usable logos. Server component, CSS-only motion.
 *
 * - When there are more logos than fit in one row, they scroll slowly in a marquee (two copies of the list, 40 s a
 *   loop, edge fade). It pauses on hover and keyboard focus. The copy is `inert` and hidden from assistive technology.
 * - Up to 6 logos show as a static grid from `lg`; below `lg` they scroll once there are 3 or more.
 * - Reduced motion: always the static grid (2 / 3 / 6 per row), and the copy is hidden.
 */
export default function ClientLogos({ clients }: { clients: Client[] }) {
  const logos = clients.map((client) => ({ client, src: logoSrc(client.logoUrl) })).filter((item) => item.src);
  if (!logos.length) return null;
  const allSample = logos.every(({ client }) => client.sample);

  const marquee = logos.length >= MIN_MARQUEE;
  const marqueeOnDesktop = logos.length > DESKTOP_ROW;
  // Class sets for the scrolling and static layouts. Static applies under reduced motion (app/globals.css also stops the
  // animation and mask there), and from lg when the logos fit in one row. The `.je-marquee*` rules are unlayered CSS,
  // so the lg overrides are marked important. Vertical padding keeps focus rings inside the clipped viewport.
  const staticGrid = "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6";
  const viewport = marquee
    ? cn(
        "je-marquee je-marquee-mask -mx-4 -my-2 overflow-hidden px-4 py-2 sm:mx-0 sm:px-0",
        !marqueeOnDesktop && "lg:overflow-visible lg:[mask-image:none]!"
      )
    : "";
  const track = marquee ? cn("je-marquee-track flex w-max motion-reduce:block motion-reduce:w-auto", !marqueeOnDesktop && "lg:block lg:w-auto lg:animate-none!") : "";
  const list = marquee
    ? cn(
        "flex shrink-0 gap-3 pr-3 sm:gap-4 sm:pr-4",
        "motion-reduce:grid motion-reduce:grid-cols-2 motion-reduce:pr-0 motion-reduce:sm:grid-cols-3 motion-reduce:lg:grid-cols-6",
        !marqueeOnDesktop && "lg:grid lg:grid-cols-6 lg:pr-0"
      )
    : staticGrid;
  const item = marquee ? cn("relative w-40 shrink-0 sm:w-44 motion-reduce:w-auto", !marqueeOnDesktop && "lg:w-auto") : "relative min-w-0";

  const items = (duplicate: boolean) =>
    logos.map(({ client, src }) => (
      <li key={`${duplicate ? "copy-" : ""}${client.id}`} className={item}>
        <LogoTile client={client} src={src} allSample={allSample} duplicate={duplicate} />
      </li>
    ));

  return (
    <Section
      eyebrow="Our clients"
      title="Trusted by homes and businesses across Lagos"
      actions={allSample ? <SampleBadge /> : undefined}
      tone="white"
      className="border-t-0"
    >
      <Reveal>
        {marquee ? (
          <div className={viewport}>
            <div className={track}>
              <ul className={list}>{items(false)}</ul>
              <ul aria-hidden="true" inert className={cn(list, "motion-reduce:hidden", !marqueeOnDesktop && "lg:hidden")}>
                {items(true)}
              </ul>
            </div>
          </div>
        ) : (
          <ul className={list}>{items(false)}</ul>
        )}
      </Reveal>
    </Section>
  );
}
