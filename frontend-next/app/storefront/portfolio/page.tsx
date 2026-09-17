import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import PageIntro, { INTRO_IMAGES } from "@/components/storefront/PageIntro";
import Section from "@/components/storefront/Section";
import ContactBand from "@/components/storefront/content/ContactBand";
import PortfolioGrid, { featuredFirst } from "@/components/storefront/content/PortfolioGrid";
import { EmptyState, buttonClasses } from "@/components/ui";
import { cn } from "@/lib/cn";
import { categoryLabel, segmentSlug, segmentTitles } from "@/lib/storefront/content";
import { getStorePortfolio, getStoreServices, getStoreSettings } from "@/lib/storefront/data";
import { portfolioCategoryPath, storeRoutes } from "@/lib/storefront/routes";
import { staggerDelay, storeDarkChip } from "@/lib/storefront/styles";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Our work",
  description: "Inverter, battery and solar installations we have completed for homes and businesses.",
  alternates: { canonical: "/portfolio" },
};

const firstValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)?.trim() ?? "";

type Chip = { value: string; label: string; count: number };

/** Filter change: the new set of projects fades in with a short rise (TEAM_AND_MOTION_V1 §8.2). */
const CROSS_FADE = { "--in-duration": "350ms", "--in-y": "8px" } as CSSProperties;

function FilterChip({ href, active, label, count }: { href: string; active: boolean; label: string; count: number }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      scroll={false}
      className={storeDarkChip(active)}
    >
      {label}
      <span className={cn("rounded-full px-2 py-0.5 text-xs tabular-nums", active ? "bg-slate-950/15 text-slate-950" : "bg-white/15 text-white")}>{count}</span>
    </Link>
  );
}

/**
 * Portfolio (fe-storefront.md §4, LANDING_V1 §7): installations with featured projects first, filtered by customer
 * segment through `?category=<slug>` chips. Chips list only categories with projects; a segment without projects shows an
 * empty state and an unknown category shows everything.
 */
export default async function PortfolioPage({ searchParams }: PageProps<"/storefront/portfolio">) {
  const query = await searchParams;
  const [portfolio, services, settings] = await Promise.all([getStorePortfolio(), getStoreServices(), getStoreSettings()]);

  const titles = segmentTitles(services.customerSegments);
  const counts = new Map<string, number>();
  for (const item of portfolio) {
    const category = item.category?.trim();
    if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  // Segment order first, then any other categories in the order they appear.
  const segmentOrder = services.customerSegments.map(segmentSlug);
  const chips: Chip[] = [...counts.entries()]
    .map(([value, count]) => ({ value, label: categoryLabel(value, titles), count }))
    .sort((a, b) => {
      const indexA = segmentOrder.indexOf(a.value);
      const indexB = segmentOrder.indexOf(b.value);
      return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
    });

  const requested = firstValue(query.category).toLowerCase();
  // A known segment without projects (linked from the home page Solutions) shows an empty state, not everything.
  const segmentMatch = segmentOrder.find((slug) => slug.toLowerCase() === requested);
  const active =
    chips.find((chip) => chip.value.toLowerCase() === requested) ??
    (segmentMatch ? { value: segmentMatch, label: categoryLabel(segmentMatch, titles), count: 0 } : null);
  const items = featuredFirst(active ? (active.count > 0 ? await getStorePortfolio({ category: active.value }) : []) : portfolio);

  return (
    <>
      <PageIntro
        eyebrow="Portfolio"
        title={active ? `Our work: ${active.label}` : "Our work"}
        description="Inverter, battery and solar installations we have completed for homes and businesses."
        image={INTRO_IMAGES.sunset}
      >
        {chips.length > 0 && (
          <nav aria-label="Filter projects by customer type">
            <ul className="flex flex-wrap gap-2">
              <li style={staggerDelay(0, 50, 450)} className="je-in">
                <FilterChip href={storeRoutes.portfolio} active={!active} label="All projects" count={portfolio.length} />
              </li>
              {chips.map((chip, index) => (
                <li key={chip.value} style={staggerDelay(index + 1, 50, 450)} className="je-in">
                  <FilterChip href={portfolioCategoryPath(chip.value)} active={active?.value === chip.value} label={chip.label} count={chip.count} />
                </li>
              ))}
            </ul>
          </nav>
        )}
      </PageIntro>

      <Section>
        <p role="status" className="sr-only">
          {items.length} {items.length === 1 ? "project" : "projects"}
          {active ? ` for ${active.label}` : ""}
        </p>
        {/* Keyed by the filter, so choosing another category replays the fade on the new set of projects. */}
        <div key={active?.value ?? "all"} style={CROSS_FADE} className="je-in">
          {items.length > 0 ? (
            <PortfolioGrid items={items} headingAs="h2" priorityCount={3} categoryTitles={titles} showCategory={!active} />
          ) : (
            <EmptyState
              standalone
              title={active ? "No projects in this group yet" : "No projects to show yet"}
              description="We’re adding photos of recent installations. Ask us for examples of systems like the one you need."
              action={
                <Link href={active ? storeRoutes.portfolio : storeRoutes.contact} className={buttonClasses()}>
                  {active ? "See all projects" : "Contact us"}
                </Link>
              }
            />
          )}
        </div>
      </Section>

      <ContactBand
        business={settings.business}
        title="Want a system like these?"
        description="Tell us about your home or business and what you need to power. We’ll recommend a setup."
      />
    </>
  );
}
