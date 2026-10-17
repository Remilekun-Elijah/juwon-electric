import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Award, HeartHandshake, Sun, Target, Users, UsersRound, Wrench } from "lucide-react";
import JsonLd from "@/components/storefront/JsonLd";
import PageIntro, { INTRO_IMAGES } from "@/components/storefront/PageIntro";
import SampleBadge from "@/components/storefront/SampleBadge";
import Section from "@/components/storefront/Section";
import Reveal from "@/components/storefront/motion/Reveal";
import { EngineerCard, GroupPanel, HeadCard, TeamGrid, cardWidth } from "@/components/storefront/team/TeamShowcase";
import { EmptyState, buttonClasses } from "@/components/ui";
import { cn } from "@/lib/cn";
import { slugify } from "@/lib/format";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getStoreTeam } from "@/lib/storefront/data";
import { storeRoutes } from "@/lib/storefront/routes";
import { storeArrowNudge, storeContainer, storePress } from "@/lib/storefront/styles";
import { groupTeam } from "@/lib/storefront/team";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Our Team",
  description: "The professionals behind Juwon Electric, delivering excellence across engineering, project execution, operations and customer experience.",
  alternates: { canonical: "/team" },
};

const VALUES = [
  { label: "Skilled Professionals", icon: Wrench },
  { label: "Customer Focused", icon: HeartHandshake },
  { label: "Driven by Excellence", icon: Award },
];

const CLOSING = [
  { label: "One Team", icon: UsersRound },
  { label: "One Goal", icon: Target },
  { label: "A Brighter Tomorrow", icon: Sun },
];

/**
 * Team page (owner's mockup, 2026-10-17): intro with our values, then the groups from the API in their order (the
 * order groups first appear in the sorted list). The first group (its name as the heading) shows as dark portrait
 * cards (heads of departments), the second as photo tiles (engineers), and every later group as a tinted
 * panel side by side. Group names, people and bios all come from the API; nothing is matched on names. Closes with
 * a "One Team, One Goal" strip linking to open roles. Structured data lists non-sample members only.
 */
export default async function TeamPage() {
  const members = await getStoreTeam();
  const groups = groupTeam(members).map((group, index) => ({ ...group, id: `team-${slugify(group.name) || index}` }));
  const allSample = members.length > 0 && members.every((member) => member.sample);
  const employees = members.filter((member) => !member.sample);

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
        title={
          <>
            Meet the <span className="text-gold-400">Team</span>
          </>
        }
        description="The professionals behind Juwon Electric, delivering excellence across engineering, project execution, operations and customer experience."
        image={INTRO_IMAGES.commercial}
        asideFirst
        aside={
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div
              aria-hidden="true"
              className="absolute -bottom-3 -left-3 h-24 w-24 rounded-2xl bg-[radial-gradient(var(--color-brand-300)_1.5px,transparent_1.5px)] [background-size:12px_12px] sm:-bottom-5 sm:-left-5 sm:h-32 sm:w-32"
            />
            <div aria-hidden="true" className="absolute -right-3 -top-3 hidden h-24 w-24 rounded-2xl bg-gold-400/15 sm:block" />
            <div className="relative aspect-[16/10] overflow-hidden rounded-3xl shadow-elev-4 ring-1 ring-white/15 sm:aspect-[4/3]">
              <Image
                src="/engineer.jpg"
                alt="A Juwon Electric engineer commissioning an inverter"
                fill
                priority
                sizes="(min-width: 1280px) 480px, (min-width: 1024px) 40vw, (min-width: 640px) 448px, 100vw"
                className="object-cover object-[50%_18%]"
              />
              <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-brand-950/70 to-transparent" />
              <p className="absolute bottom-4 left-5 text-sm font-semibold text-white">
                An engineer, <span className="text-gold-400">on site</span>
              </p>
            </div>
          </div>
        }
      >
        <div className="max-w-2xl space-y-4 text-base leading-relaxed text-white/75">
          <p>
            At Juwon Electric, our greatest strength is our people. We are a team of skilled, passionate and dedicated
            professionals working together to power homes and businesses with reliable, sustainable and innovative solar
            energy solutions.
          </p>
          <p>
            From our engineers and project teams to our customer support and administrative staff, every member plays a
            vital role in ensuring your satisfaction and a brighter, cleaner future.
          </p>
        </div>
        <ul className="mt-8 grid grid-cols-3 gap-3 border-t border-white/10 pt-6 sm:flex sm:flex-wrap sm:gap-x-10 sm:gap-y-5">
          {VALUES.map(({ label, icon: Icon }) => (
            <li key={label} className="flex flex-col items-center gap-2 text-center text-sm font-semibold text-white sm:flex-row sm:gap-3 sm:text-left">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold-400 text-slate-950 shadow-elev-2">
                <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
              </span>
              <span className="max-w-[7rem] leading-snug">{label}</span>
            </li>
          ))}
          {allSample && (
            <li className="flex items-center">
              <SampleBadge tone="brand" />
            </li>
          )}
        </ul>
      </PageIntro>

      {groups.length === 0 && (
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

      {groups.slice(0, 2).map((group, index) => {
        const Card = index === 0 ? HeadCard : EngineerCard;
        return (
          <Section
            key={group.id}
            id={group.id}
            tone={index === 0 ? "white" : "slate"}
            eyebrow={group.members.length === 1 ? "1 person" : `${group.members.length} people`}
            title={group.name}
            align="center"
            className="scroll-mt-20"
          >
            <TeamGrid>
              {group.members.map((member) => (
                <li key={member.id} className={cn("min-w-0", cardWidth)}>
                  <Card member={member} />
                </li>
              ))}
            </TeamGrid>
          </Section>
        );
      })}

      {groups.length > 2 && (
        <section aria-label="More of our team" className="border-y border-slate-200 bg-white py-10 sm:py-14">
          <Reveal as="ul" stagger className={cn(storeContainer, "flex flex-col gap-4 md:flex-row md:flex-wrap md:items-stretch md:justify-center md:gap-5")}>
            {groups.slice(2).map((group, index) => (
              <li key={group.id} className="min-w-0">
                <GroupPanel group={group} tint={index} />
              </li>
            ))}
          </Reveal>
        </section>
      )}

      <section aria-labelledby="team-join-heading" className="border-y border-brand-100 bg-brand-50 py-8 sm:py-10">
        <Reveal className={cn(storeContainer, "flex flex-col items-center gap-6 lg:flex-row lg:justify-between")}>
          <h2 id="team-join-heading" className="sr-only">
            Work with us
          </h2>
          <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {CLOSING.map(({ label, icon: Icon }) => (
              <li key={label} className="flex items-center gap-3 text-base font-semibold text-slate-900">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-400 text-slate-950">
                  <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
                </span>
                {label}
              </li>
            ))}
          </ul>
          <Link href={storeRoutes.vacancies} className={buttonClasses({ size: "lg", className: cn("group w-full shrink-0 sm:w-auto", storePress) })}>
            Work With Us
            <ArrowRight aria-hidden="true" className={storeArrowNudge} />
          </Link>
        </Reveal>
      </section>
    </>
  );
}
