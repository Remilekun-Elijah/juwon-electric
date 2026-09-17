import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Briefcase, Users } from "lucide-react";
import BrandPanel from "@/components/storefront/BrandPanel";
import JsonLd from "@/components/storefront/JsonLd";
import PageIntro, { INTRO_IMAGES } from "@/components/storefront/PageIntro";
import SampleBadge from "@/components/storefront/SampleBadge";
import Section from "@/components/storefront/Section";
import CountUp from "@/components/storefront/motion/CountUp";
import Reveal from "@/components/storefront/motion/Reveal";
import TeamCard from "@/components/storefront/team/TeamCard";
import { EmptyState, buttonClasses } from "@/components/ui";
import { cn } from "@/lib/cn";
import { slugify } from "@/lib/format";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getStoreTeam } from "@/lib/storefront/data";
import { storeRoutes } from "@/lib/storefront/routes";
import { storeArrowNudge, storeContainer, storeH2, storePress, storeSection } from "@/lib/storefront/styles";
import { groupTeam, teamStats } from "@/lib/storefront/team";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Our Team",
  description: "The engineers, installers and customer care staff behind every Juwon Electric system.",
  alternates: { canonical: "/team" },
};

/** Cards in the first row load eagerly (4 across at 1280 px). */
const PRIORITY_PHOTOS = 4;

const onBrand = "focus-visible:ring-white focus-visible:ring-offset-brand-800";

/**
 * Team page (TEAM_AND_MOTION_V1 §4): intro, a count-up stats strip computed from the data, one section per group with a
 * headshot card grid (2 / 3 / 4 columns), and a "Want to join us?" band. Structured data lists non-sample members only.
 */
export default async function TeamPage() {
  const members = await getStoreTeam();
  const groups = groupTeam(members).map((group, index) => ({ ...group, id: `team-${slugify(group.name) || index}` }));
  const stats = teamStats(groups);
  const allSample = members.length > 0 && members.every((member) => member.sample);
  const employees = members.filter((member) => !member.sample);
  let photoIndex = 0;

  return (
    <>
      {employees.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            "@id": `${SITE_URL}/#organization`,
            name: SITE_NAME,
            url: SITE_URL,
            employee: employees.map((member) => ({ "@type": "Person", name: member.name, jobTitle: member.role })),
          }}
        />
      )}

      <PageIntro
        eyebrow="Our people"
        title="Our Team"
        description="The engineers, installers and customer care staff behind every Juwon Electric system."
        image={INTRO_IMAGES.commercial}
      >
        {members.length > 0 && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:flex sm:flex-wrap sm:gap-x-10">
              {stats.map((stat) => (
                <div key={stat.label} className="flex min-w-0 flex-col-reverse gap-0.5 border-l-2 border-gold-400/50 pl-4">
                  <dt className="text-sm text-white/75">{stat.label}</dt>
                  <dd className="text-3xl font-semibold tabular-nums tracking-tight text-gold-400">
                    <CountUp value={stat.value} delay={500} />
                  </dd>
                </div>
              ))}
            </dl>
            {allSample && <SampleBadge tone="brand" />}
          </div>
        )}
      </PageIntro>

      {groups.length > 0 ? (
        groups.map((group, groupIndex) => (
          <Section
            key={group.id}
            id={group.id}
            tone={groupIndex % 2 === 1 ? "white" : "slate"}
            title={group.name}
            className={cn("scroll-mt-20", groupIndex > 0 && "pt-12 sm:pt-16")}
          >
            <Reveal as="ul" stagger className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4">
              {group.members.map((member) => {
                const priority = photoIndex++ < PRIORITY_PHOTOS;
                return (
                  <li key={member.id} className="min-w-0">
                    <TeamCard member={member} priority={priority} />
                  </li>
                );
              })}
            </Reveal>
          </Section>
        ))
      ) : (
        <Section>
          <EmptyState
            standalone
            icon={Users}
            title="Our Team page is being updated"
            description="Call or message us and one of our engineers or customer care staff will help you."
            action={
              <Link href={storeRoutes.contact} className={buttonClasses()}>
                Contact us
              </Link>
            }
          />
        </Section>
      )}

      <section aria-labelledby="team-join-heading" className={storeSection}>
        <Reveal className={storeContainer}>
          <BrandPanel ring="bottom-left" className="px-5 py-10 sm:px-10 sm:py-12 lg:px-14">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 gap-4">
                <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 sm:flex">
                  <Briefcase aria-hidden="true" className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <h2 id="team-join-heading" className={cn(storeH2, "text-white")}>
                    Want to join us?
                  </h2>
                  <p className="mt-2 max-w-xl text-base leading-relaxed text-brand-50/90">
                    We’re always glad to hear from engineers, installers and customer care staff who take pride in their work.
                  </p>
                </div>
              </div>
              <Link
                href={storeRoutes.vacancies}
                className={buttonClasses({
                  variant: "secondary",
                  size: "lg",
                  className: cn("group w-full shrink-0 bg-white text-brand-800 hover:bg-brand-50 md:w-auto", onBrand, storePress),
                })}
              >
                See open roles
                <ArrowRight aria-hidden="true" className={storeArrowNudge} />
              </Link>
            </div>
          </BrandPanel>
        </Reveal>
      </section>
    </>
  );
}
