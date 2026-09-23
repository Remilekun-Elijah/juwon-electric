import { ExternalLink } from "lucide-react";
import SiteImage from "@/components/public/SiteImage";
import SampleBadge from "@/components/storefront/SampleBadge";
import type { TeamMember } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { storeFocus, storeImageZoom } from "@/lib/storefront/styles";
import { isAllowedUrl } from "@/lib/validation";

/** Site paths and http(s) URLs only (LANDING_V1 site-path rule); anything else shows the initials avatar. */
export const teamPhotoSrc = (url: string | null | undefined) => {
  const value = (url || "").trim();
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return /^https?:\/\//i.test(value) ? value : "";
};

/** LinkedIn link when it is a safe https URL. */
export const teamLinkedinHref = (url: string | null | undefined) => {
  const value = (url || "").trim();
  return value && /^https:\/\//i.test(value) && isAllowedUrl(value) ? value : "";
};

/** Up to two initials: "Adaeze Okafor" → "AO", "Tunde" → "T". */
export const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

/** Soft backgrounds for the initials avatar, picked from the name so a member always gets the same one. */
const AVATAR_TONES = ["bg-brand-50 text-brand-700", "bg-slate-100 text-slate-700", "bg-amber-50 text-amber-800", "bg-brand-100 text-brand-800"];
const toneFor = (name: string) => AVATAR_TONES[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_TONES.length];

function LinkedinLink({ href, name, onBrand = false }: { href: string; name: string; onBrand?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-sm text-sm font-medium underline-offset-4 hover:underline md:min-h-8",
        storeFocus,
        onBrand ? "text-white focus-visible:ring-white focus-visible:ring-offset-surface" : "text-brand-700 hover:text-brand-800"
      )}
    >
      LinkedIn
      <span className="sr-only">
        {" "}
        profile of {name} (opens in a new tab)
      </span>
      <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
    </a>
  );
}

export type TeamCardProps = {
  member: TeamMember;
  /** Heading level for the name (h3 under a group h2). */
  headingAs?: "h2" | "h3";
  /** Load the photo eagerly (first row at the top of the page). */
  priority?: boolean;
};

/**
 * Team headshot card (TEAM_AND_MOTION_V1 §4): square photo with a rounded-2xl frame, name and role, and a Sample pill.
 *
 * - Devices that can hover: the photo zooms and a brand gradient slides up with the bio and LinkedIn link, on hover
 *   or keyboard focus. The frame is focusable when it has a bio but no link, so keyboard users can open it too.
 * - Touch devices (`hover: none`): no overlay; the bio and link sit under the role instead.
 * - The bio is in the markup once per mode, so screen readers and crawlers always get it. Server component.
 */
export default function TeamCard({ member, headingAs: Heading = "h3", priority = false }: TeamCardProps) {
  const photo = teamPhotoSrc(member.photoUrl);
  const bio = member.bio?.trim() || "";
  const linkedin = teamLinkedinHref(member.linkedinUrl);
  const hasOverlay = Boolean(bio || linkedin);
  const focusableFrame = Boolean(bio && !linkedin);

  return (
    <article className="group flex h-full flex-col">
      <div
        tabIndex={focusableFrame ? 0 : undefined}
        aria-label={focusableFrame ? `About ${member.name}` : undefined}
        role={focusableFrame ? "group" : undefined}
        className={cn(
          "relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-elev-1",
          "transition-[translate,box-shadow] duration-200 ease-out group-hover:shadow-elev-3 group-focus-within:shadow-elev-3 motion-safe:group-hover:-translate-y-0.5",
          focusableFrame && storeFocus
        )}
      >
        {photo ? (
          <SiteImage
            src={photo}
            alt={`Photo of ${member.name}`}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 280px, (min-width: 768px) 30vw, 45vw"
            className={cn("object-cover", storeImageZoom)}
          />
        ) : (
          <div aria-hidden="true" className={cn("absolute inset-0 flex items-center justify-center", toneFor(member.name))}>
            <span className="text-4xl font-semibold tracking-tight sm:text-5xl">{initialsOf(member.name)}</span>
          </div>
        )}

        {member.sample && <SampleBadge className="absolute left-2.5 top-2.5 bg-white/90 backdrop-blur-sm" />}

        {hasOverlay && (
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 hidden max-h-full flex-col justify-end bg-gradient-to-t from-surface/95 via-surface/80 to-surface/0 p-4 pt-12 text-white sm:p-5 sm:pt-14",
              "[@media(hover:hover)]:flex",
              "translate-y-3 opacity-0 transition duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100",
              "motion-reduce:translate-y-0"
            )}
          >
            {bio && <p className="line-clamp-6 text-sm leading-relaxed text-brand-50">{bio}</p>}
            {linkedin && (
              <div className={cn(bio && "mt-2")}>
                <LinkedinLink href={linkedin} name={member.name} onBrand />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="pt-3 sm:pt-4">
        <Heading className="text-base font-semibold leading-snug tracking-tight text-slate-900">{member.name}</Heading>
        <p className="mt-0.5 text-sm text-slate-600">{member.role}</p>
        {hasOverlay && (
          <div className="[@media(hover:hover)]:hidden">
            {bio && <p className="mt-2 text-sm leading-relaxed text-slate-600">{bio}</p>}
            {linkedin && <LinkedinLink href={linkedin} name={member.name} />}
          </div>
        )}
      </div>
    </article>
  );
}
