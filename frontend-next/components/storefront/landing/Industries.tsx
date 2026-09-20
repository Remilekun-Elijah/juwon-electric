import { Building, Building2, Factory, GraduationCap, HeartPulse, Hotel, House, Landmark, Store, Waypoints, type LucideIcon } from "lucide-react";
import Section from "@/components/storefront/Section";
import Reveal from "@/components/storefront/motion/Reveal";
import { cn } from "@/lib/cn";
import { storeCard, storeHoverLift } from "@/lib/storefront/styles";

type Industry = { name: string; icon: LucideIcon };

/** Curated list of the industries we serve. Static content: no photos, no admin record, not tied to a project. */
const INDUSTRIES: Industry[] = [
  { name: "Banking & Financial Institutions", icon: Landmark },
  { name: "Healthcare", icon: HeartPulse },
  { name: "Hospitality", icon: Hotel },
  { name: "Manufacturing & Industrial", icon: Factory },
  { name: "Real Estate", icon: Building2 },
  { name: "Education", icon: GraduationCap },
  { name: "Commercial Facilities", icon: Store },
  { name: "Infrastructure", icon: Waypoints },
];

type Scale = { name: string; description: string; icon: LucideIcon };

const SCALES: Scale[] = [
  { name: "Residential", description: "Homes, apartments and estates that need dependable backup power.", icon: House },
  { name: "Commercial", description: "Offices, shops and mixed-use buildings that run through the day.", icon: Building },
  { name: "Industrial & Utility-Scale", description: "Factories and large sites with heavy, continuous loads.", icon: Factory },
];

/**
 * "Industries We Serve": the industries we design and install for, as image-free icon cards in a staggered grid.
 * Static, curated content — deliberately without installation photos, since a photo may not be from that industry.
 * Shared by the home page and the services page. Server component.
 */
export function IndustriesSection() {
  return (
    <Section
      eyebrow="Who we serve"
      title="Industries We Serve"
      description="Tailored solar and energy solutions for homes, businesses and institutions, engineered around each client’s energy requirements and operational needs."
    >
      <Reveal as="ul" stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {INDUSTRIES.map(({ name, icon: Icon }) => (
          <li key={name} className="min-w-0">
            <div className={cn(storeCard, storeHoverLift, "flex h-full items-center gap-4 p-5 sm:flex-col sm:items-start sm:gap-5 sm:p-6")}>
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 sm:h-12 sm:w-12">
                <Icon aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.75} />
              </span>
              <p className="text-base font-semibold tracking-tight text-slate-900">{name}</p>
            </div>
          </li>
        ))}
      </Reveal>
    </Section>
  );
}

/**
 * "Solutions by Scale": the three project sizes we deliver, as icon cards. Static content, shown under the industries.
 * Server component.
 */
export function SolutionsByScale() {
  return (
    <Section
      tone="tint"
      eyebrow="Every project size"
      title="Solutions by Scale"
      description="From a single home to utility-scale sites, we size, deliver and install the right system for the load."
    >
      <Reveal as="ul" stagger className="grid gap-4 sm:grid-cols-3 lg:gap-5">
        {SCALES.map(({ name, description, icon: Icon }) => (
          <li key={name} className="min-w-0">
            <div className={cn(storeCard, storeHoverLift, "flex h-full flex-col gap-3 p-6")}>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Icon aria-hidden="true" className="h-6 w-6" strokeWidth={1.75} />
              </span>
              <p className="text-lg font-semibold tracking-tight text-slate-900">{name}</p>
              <p className="text-sm leading-relaxed text-slate-600">{description}</p>
            </div>
          </li>
        ))}
      </Reveal>
    </Section>
  );
}

/** The industries grid followed by the "Solutions by Scale" band. Server component. */
export default function Industries() {
  return (
    <>
      <IndustriesSection />
      <SolutionsByScale />
    </>
  );
}
