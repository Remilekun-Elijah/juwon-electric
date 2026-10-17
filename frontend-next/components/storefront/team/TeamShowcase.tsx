import type { ReactNode } from "react";
import SiteImage from "@/components/public/SiteImage";
import SampleBadge from "@/components/storefront/SampleBadge";
import Reveal from "@/components/storefront/motion/Reveal";
import type { TeamMember } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { storeHoverLift, storeImageZoom } from "@/lib/storefront/styles";
import type { TeamGroup } from "@/lib/storefront/team";
import { LinkedinLink, initialsOf, teamLinkedinHref, teamPhotoSrc } from "./TeamCard";

// Team page cards in the owner's mockup style (2026-10-17). Everything shown comes from the API: name, role, bio,
// photo, LinkedIn and the group name. The page picks a style by the group's position (team/page.tsx).

/** The name is the card's heading, so the photo is decorative (alt=""), and the initials avatar is hidden too. */
function Photo({ member, sizes }: { member: TeamMember; sizes: string }) {
  const photo = teamPhotoSrc(member.photoUrl);
  return photo ? (
    <SiteImage src={photo} alt="" fill sizes={sizes} className={cn("object-cover object-top", storeImageZoom)} />
  ) : (
    <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center bg-brand-50 text-brand-700">
      <span className="text-3xl font-semibold tracking-tight sm:text-4xl">{initialsOf(member.name)}</span>
    </div>
  );
}

const sampleBadge = "absolute left-2 top-2 bg-white/90 backdrop-blur-sm";

/** One card width for every section and panel, so all photos are the same size: 2 across on phones, then fixed. */
export const cardWidth = "w-[calc(50%-0.375rem)] shrink-0 md:w-52 xl:w-56";
const photoSizes = "(min-width: 1280px) 224px, (min-width: 768px) 208px, 48vw";

export type CardProps = { member: TeamMember; headingAs?: "h3" | "h4" };

/**
 * Head of department (first group): portrait photo over a deep brand-red caption with the role in bold white, the
 * name in gold and the full bio, as in the mockup. Server component.
 */
export function HeadCard({ member, headingAs: Heading = "h3" }: CardProps) {
  const bio = member.bio?.trim();
  const linkedin = teamLinkedinHref(member.linkedinUrl);
  return (
    <article className={cn("group flex h-full flex-col overflow-hidden rounded-2xl bg-brand-900 text-white shadow-elev-2", storeHoverLift)}>
      <div className="relative aspect-4/5 overflow-hidden bg-brand-950">
        <Photo member={member} sizes={photoSizes} />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-brand-900 to-transparent" />
        {member.sample && <SampleBadge className={sampleBadge} />}
      </div>
      <div className="flex flex-1 flex-col px-3 pb-3 pt-1 sm:px-4 sm:pb-4">
        <p className="text-sm font-semibold leading-snug">{member.role}</p>
        <Heading className="mt-0.5 text-sm font-medium leading-snug text-gold-400">{member.name}</Heading>
        {bio && <p className="mt-2 text-xs leading-relaxed text-white/75">{bio}</p>}
        {linkedin && (
          <div className="mt-auto pt-1">
            <LinkedinLink href={linkedin} name={member.name} onBrand />
          </div>
        )}
      </div>
    </article>
  );
}

/**
 * Engineer (second group): a photo tile with the name and role on a dark fade at the bottom, and the bio under the
 * tile. Server component.
 */
export function EngineerCard({ member, headingAs: Heading = "h3" }: CardProps) {
  const bio = member.bio?.trim();
  const linkedin = teamLinkedinHref(member.linkedinUrl);
  return (
    <article className="group flex h-full flex-col">
      <div className={cn("relative aspect-4/5 overflow-hidden rounded-2xl bg-slate-100 shadow-elev-1", storeHoverLift)}>
        <Photo member={member} sizes={photoSizes} />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-brand-950/90 via-brand-950/40 to-transparent" />
        {member.sample && <SampleBadge className={sampleBadge} />}
        <div className="absolute inset-x-0 bottom-0 p-3 text-white">
          <Heading className="text-sm font-semibold leading-snug">{member.name}</Heading>
          <p className="text-xs leading-snug text-gold-400">{member.role}</p>
        </div>
      </div>
      {bio && <p className="mt-2 px-0.5 text-xs leading-relaxed text-slate-600 sm:text-sm">{bio}</p>}
      {linkedin && (
        <div className="px-0.5">
          <LinkedinLink href={linkedin} name={member.name} />
        </div>
      )}
    </article>
  );
}

/**
 * A later group as a tinted panel (mockup's Customer Service / Administration / Finance panels): the group name as
 * its heading and its members as photo tiles with name, role and bio. Panels take turns between three soft tints.
 * Server component.
 */
export function GroupPanel({ group, tint }: { group: TeamGroup & { id: string }; tint: number }) {
  const tone = ["border-brand-100 bg-brand-50", "border-amber-200 bg-amber-50", "border-slate-200 bg-slate-100"][tint % 3];
  return (
    <section id={group.id} aria-labelledby={`${group.id}-heading`} className={cn("flex h-full scroll-mt-20 flex-col rounded-2xl border p-3 sm:p-5", tone)}>
      <h3 id={`${group.id}-heading`} className="text-center text-lg font-semibold tracking-tight text-brand-800">
        {group.name}
      </h3>
      <ul className="mt-4 flex flex-wrap justify-center gap-3">
        {group.members.map((member) => {
          const bio = member.bio?.trim();
          return (
            <li key={member.id} className={cn("min-w-0", cardWidth)}>
              <article className="group">
                <div className="relative aspect-4/5 overflow-hidden rounded-xl bg-white shadow-elev-1">
                  <Photo member={member} sizes={photoSizes} />
                  {member.sample && <SampleBadge className={sampleBadge} />}
                </div>
                <h4 className="pt-2 text-sm font-semibold leading-snug text-slate-900">{member.name}</h4>
                <p className="text-xs font-medium text-brand-700">{member.role}</p>
                {bio && <p className="mt-1 text-xs leading-relaxed text-slate-600">{bio}</p>}
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Centred card row for the first two groups. Every card has the same width (`cardWidth`), so photos match across
 * the page (on phones the row is inset by a panel's padding and border, so its cards match the panel tiles). A
 * short last row sits in the middle.
 */
export function TeamGrid({ children }: { children: ReactNode }) {
  return (
    <Reveal as="ul" stagger className="flex flex-wrap justify-center gap-3 px-[0.8125rem] md:gap-5 md:px-0">
      {children}
    </Reveal>
  );
}
