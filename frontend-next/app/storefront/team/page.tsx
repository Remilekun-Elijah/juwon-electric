import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Award, HeartHandshake, Sun, Target, Users, UsersRound, Wrench } from "lucide-react";
import JsonLd from "@/components/storefront/JsonLd";
import PageIntro, { INTRO_IMAGES } from "@/components/storefront/PageIntro";
import SampleBadge from "@/components/storefront/SampleBadge";
import Section from "@/components/storefront/Section";
import Reveal from "@/components/storefront/motion/Reveal";
import { EngineerCard, GroupPanel, HeadCard, TeamGrid } from "@/components/storefront/team/TeamShowcase";
import type { TeamGroup } from "@/lib/storefront/team";
import { EmptyState, buttonClasses } from "@/components/ui";
import { cn } from "@/lib/cn";
import { slugify } from "@/lib/format";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getStoreTeam } from "@/lib/storefront/data";
import { storeRoutes } from "@/lib/storefront/routes";
import { storeArrowNudge, storeContainer, storePress } from "@/lib/storefront/styles";
import { groupTeam, isEngineeringGroup, isLeadershipGroup } from "@/lib/storefront/team";

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

type Card = typeof HeadCard | typeof EngineerCard;

/**
 * The groups of one section as card rows. A single group is one row; several groups each get their name as a
 * centred h3 above their row, so the admin's Group heading still shows (cards then use h4).
 */
function GroupRows({ groups, card: CardComponent, columns }: { groups: (TeamGroup & { id: string })[]; card: Card; columns?: 4 | 5 }) {
  const labelled = groups.length > 1;
  return (
    <div className="space-y-10 sm:space-y-12">
      {groups.map((group) => (
        <div key={group.id} id={group.id} className="scroll-mt-20">
          {labelled && <h3 className="mb-5 text-center text-lg font-semibold tracking-tight text-slate-900 sm:mb-6">{group.name}</h3>}
          <TeamGrid columns={columns}>
            {group.members.map((member) => (
              <li key={member.id} className="min-w-0">
                <CardComponent member={member} headingAs={labelled ? "h4" : "h3"} />
              </li>
            ))}
          </TeamGrid>
        </div>
      ))}
    </div>
  );
}

/**
 * Team page (2026-10-12 owner layout): intro with our values, "Meet the Heads of Departments" (leadership groups),
 * "Meet the Engineers" (engineering and installation groups), "Meet the Support Teams" (every other group, as tinted
 * panels side by side), and a "One Team, One Goal" strip linking to open roles. Groups are matched by name
 * (lib/storefront/team); gold stays on dark surfaces (TEAM_AND_MOTION_V1 §7.1). Structured data lists non-sample
 * members only.
 */
export default async function TeamPage() {
  const members = await getStoreTeam();
  const groups = groupTeam(members).map((group, index) => ({ ...group, id: `team-${slugify(group.name) || index}` }));
  const heads = groups.filter((group) => isLeadershipGroup(group.name));
  const engineers = groups.filter((group) => !isLeadershipGroup(group.name) && isEngineeringGroup(group.name));
  const others = groups.filter((group) => !isLeadershipGroup(group.name) && !isEngineeringGroup(group.name));
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
            <div aria-hidden="true" className="absolute -bottom-5 -left-5 hidden h-44 w-44 rounded-full border-[12px] border-gold-400/70 sm:block" />
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
                Our engineers, <span className="text-gold-400">on site</span>
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

      {heads.length > 0 && (
        <Section
          id="heads-of-departments"
          tone="white"
          eyebrow="Our departments"
          title={
            <>
              Meet the <span className="text-brand-700">Heads of Departments</span>
            </>
          }
          description="Strategic leadership driving efficiency, innovation and exceptional service at Juwon Electric."
          align="center"
          className="scroll-mt-20"
        >
          <GroupRows groups={heads} card={HeadCard} />
        </Section>
      )}

      {engineers.length > 0 && (
        <Section
          id="engineers"
          eyebrow="Field and technical"
          title={
            <>
              Meet the <span className="text-brand-700">Engineers</span>
            </>
          }
          description="Our skilled field and technical engineers design, install and maintain reliable solar solutions."
          align="center"
          className="scroll-mt-20"
        >
          <GroupRows groups={engineers} card={EngineerCard} columns={4} />
        </Section>
      )}

      {others.length > 0 && (
        <Section
          id="support-teams"
          tone="white"
          eyebrow="Behind the scenes"
          title={
            <>
              Meet the <span className="text-brand-700">Support Teams</span>
            </>
          }
          description="The people who keep every order, installation and customer conversation running smoothly."
          align="center"
          className="scroll-mt-20"
        >
          <Reveal
            as="ul"
            stagger
            className={cn("grid gap-5", others.length === 2 && "md:grid-cols-2", others.length >= 3 && "md:grid-cols-2 lg:grid-cols-3")}
          >
            {others.map((group) => (
              <li key={group.id} className={cn("min-w-0", others.length === 1 && "mx-auto w-full max-w-2xl")}>
                <GroupPanel group={group} />
              </li>
            ))}
          </Reveal>
        </Section>
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
