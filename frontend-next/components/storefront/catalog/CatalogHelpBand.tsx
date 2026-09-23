import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import BrandPanel from "@/components/storefront/BrandPanel";
import { buttonClasses } from "@/components/ui";
import { contactTopicPath } from "@/lib/storefront/routes";

export type CatalogHelpBandProps = {
  title?: string;
  description?: string;
  /** Prefills the contact form topic. */
  topic?: string;
  secondary?: { label: string; href: string };
};

/** Brand panel inviting the visitor to talk to an engineer. Server component. */
export default function CatalogHelpBand({
  title = "Not sure which size you need?",
  description = "Tell us what you want to keep running during NEPA outages and an engineer will recommend a system and send a quote.",
  topic = "Help choosing a package",
  secondary,
}: CatalogHelpBandProps) {
  return (
    <BrandPanel as="aside" aria-label="Get help choosing" className="p-6 sm:p-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
          <p className="mt-2 text-white/80">{description}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
          <Link
            href={contactTopicPath(topic)}
            className={buttonClasses({ variant: "secondary", size: "lg", className: "bg-white text-brand-800 hover:bg-brand-50" })}
          >
            <Phone aria-hidden="true" />
            Talk to an engineer
          </Link>
          {secondary && (
            <Link
              href={secondary.href}
              className={buttonClasses({
                variant: "outline",
                size: "lg",
                className: "border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white",
              })}
            >
              {secondary.label}
              <ArrowRight aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </BrandPanel>
  );
}
