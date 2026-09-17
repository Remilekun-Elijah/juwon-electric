import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { SITE_URL } from "@/lib/site";
import { storeFocus } from "@/lib/storefront/styles";
import JsonLd from "./JsonLd";

export type Crumb = { label: string; href?: string };

export type BreadcrumbsProps = {
  /** Trail from the top level down. The last item is the current page (its `href` is only used for JSON-LD). */
  items: Crumb[];
  /** Adds a schema.org BreadcrumbList. Default true. */
  jsonLd?: boolean;
  className?: string;
};

/** "Home / Products / Inverters" trail with `aria-current="page"` on the last item. Server component. */
export default function Breadcrumbs({ items, jsonLd = true, className }: BreadcrumbsProps) {
  const trail: Crumb[] = [{ label: "Home", href: "/" }, ...items];

  return (
    <nav aria-label="Breadcrumb" className={className}>
      {jsonLd && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: trail.map((crumb, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: crumb.label,
              ...(crumb.href ? { item: `${SITE_URL}${crumb.href === "/" ? "" : crumb.href}` } : {}),
            })),
          }}
        />
      )}
      <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
        {trail.map((crumb, index) => {
          const last = index === trail.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 && <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />}
              {last || !crumb.href ? (
                <span aria-current={last ? "page" : undefined} className={cn("truncate", last && "font-medium text-slate-700")}>
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className={cn("truncate rounded-sm transition-colors hover:text-brand-700", storeFocus)}>
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
