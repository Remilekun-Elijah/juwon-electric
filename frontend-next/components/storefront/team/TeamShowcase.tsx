import type { ReactNode } from "react";
import SiteImage from "@/components/public/SiteImage";
import SampleBadge from "@/components/storefront/SampleBadge";
import Reveal from "@/components/storefront/motion/Reveal";
import type { TeamMember } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { storeCard, storeHoverLift, storeImageZoom } from "@/lib/storefront/styles";
import { groupBlurb, type TeamGroup } from "@/lib/storefront/team";
import { LinkedinLink, initialsOf, teamLinkedinHref, teamPhotoSrc } from "./TeamCard";

function Photo({ member, sizes, priority = false }: { member: TeamMember; sizes: string; priority?: boolean }) {
  const photo = teamPhotoSrc(member.photoUrl);
  return photo ? (
    <SiteImage src={photo} alt={`Photo of ${member.name}`} fill priority={priority} sizes={sizes} className={cn("object-cover", storeImageZoom)} />
  ) : (
    <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center bg-brand-50 text-brand-700">
      <span className="text-4xl font-semibold tracking-tight">{initialsOf(member.name)}</span>
    </div>
  );
}

const sampleBadge = "absolute left-2.5 top-2.5 bg-white/90 backdrop-blur-sm";

/** Bio (in full: it is at most 300 characters) and LinkedIn link under a card's name and role. */
function MemberDetails({ member, small = false }: { member: TeamMember; small?: boolean }) {
  const bio = member.bio?.trim();
  const linkedin = teamLinkedinHref(member.linkedinUrl);
  if (!bio && !linkedin) return null;
  return (
    <>
      {bio && <p className={cn("mt-2 leading-relaxed text-slate-600", small ? "text-xs" : "text-sm")}>{bio}</p>}
      {linkedin && (
        <div className={cn(bio ? "mt-1" : "mt-1.5")}>
          <LinkedinLink href={linkedin} name={member.name} />
        </div>
      )}
    </>
  );
}

export type CardProps = {
  member: TeamMember;
  /** Heading level for the name: h3 under a section h2, h4 under a group h3. */
  headingAs?: "h3" | "h4";
};

/**
 * Head of department: portrait photo over a white caption with the name as the heading, the role in brand red (kept
 * at two lines of height so neighbouring captions line up), the bio in full and a LinkedIn link when set. Server
 * component.
 */
export function HeadCard({ member, headingAs: Heading = "h3" }: CardProps) {
  return (
    <article className={cn(storeCard, storeHoverLift, "group flex h-full flex-col overflow-hidden")}>
      <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
        <Photo member={member} sizes="(min-width: 1280px) 240px, (min-width: 768px) 30vw, 45vw" />
        {member.sample && <SampleBadge className={sampleBadge} />}
      </div>
      <div className="flex flex-1 flex-col border-t-[3px] border-brand-700 p-4">
        <Heading className="text-base font-semibold leading-snug tracking-tight text-slate-900">{member.name}</Heading>
        <p className="mt-0.5 min-h-[2.5rem] text-sm font-medium leading-snug text-brand-700">{member.role}</p>
        <MemberDetails member={member} />
      </div>
    </article>
  );
}

/** Engineer: landscape photo card with name, role, bio and LinkedIn link under it. Server component. */
export function EngineerCard({ member, headingAs: Heading = "h3" }: CardProps) {
  return (
    <article className="group flex h-full flex-col">
      <div
        className={cn(
          "relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-elev-1",
          "transition-[translate,box-shadow] duration-200 ease-out group-hover:shadow-elev-3 motion-safe:group-hover:-translate-y-0.5"
        )}
      >
        <Photo member={member} sizes="(min-width: 1280px) 240px, (min-width: 768px) 30vw, 45vw" />
        {member.sample && <SampleBadge className={sampleBadge} />}
      </div>
      <Heading className="pt-3 text-base font-semibold leading-snug tracking-tight text-slate-900">{member.name}</Heading>
      <p className="mt-0.5 text-sm text-slate-600">{member.role}</p>
      <MemberDetails member={member} />
    </article>
  );
}

/**
 * One support team (customer service, administration, finance…) as a brand-50 panel: centred title, a one-line
 * blurb and its members in a row of two (three once the panel is wide enough, from `lg`). A team of one or two gets
 * wider tiles, so the panel isn't mostly empty. Server component.
 */
export function GroupPanel({ group }: { group: TeamGroup & { id: string } }) {
  const blurb = groupBlurb(group.name);
  const count = group.members.length;
  const tile =
    count === 1
      ? "w-[60%] sm:w-[45%] lg:w-[40%]"
      : count === 2
        ? "w-[calc(50%-0.375rem)] lg:w-[38%]"
        : "w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)]";
  return (
    <section
      id={group.id}
      aria-labelledby={`${group.id}-heading`}
      className="flex h-full scroll-mt-20 flex-col rounded-2xl border border-brand-100 bg-brand-50 p-5 text-center sm:p-6"
    >
      <h3 id={`${group.id}-heading`} className="text-lg font-semibold tracking-tight text-brand-800">
        {group.name}
      </h3>
      {blurb && <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-slate-600">{blurb}</p>}
      <ul className="mt-5 flex flex-wrap justify-center gap-3">
        {group.members.map((member) => (
          <li key={member.id} className={cn("min-w-0", tile)}>
            <article className="group text-left">
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-white shadow-elev-1">
                <Photo member={member} sizes="(min-width: 1024px) 140px, 45vw" />
                {member.sample && <SampleBadge className="absolute left-2 top-2 bg-white/90 backdrop-blur-sm" />}
              </div>
              <h4 className="pt-2 text-sm font-semibold leading-snug text-slate-900">{member.name}</h4>
              <p className="text-sm text-slate-600">{member.role}</p>
              <MemberDetails member={member} small />
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Staggered, centred card row: 2 across on phones, 3 on tablets, and `columns` (4 or 5) on wide screens. Cards keep
 * a fixed share of the width, so a short last row sits in the middle instead of leaving a gap on the right.
 */
export function TeamGrid({ columns = 5, children }: { columns?: 4 | 5; children: ReactNode }) {
  return (
    <Reveal
      as="ul"
      stagger
      className={cn(
        "flex flex-wrap justify-center gap-4 md:gap-5",
        "[&>li]:w-[calc(50%-0.5rem)] md:[&>li]:w-[calc(33.333%-0.875rem)]",
        columns === 5 ? "xl:[&>li]:w-[calc(20%-1rem)]" : "xl:[&>li]:w-[calc(25%-1rem)]"
      )}
    >
      {children}
    </Reveal>
  );
}
