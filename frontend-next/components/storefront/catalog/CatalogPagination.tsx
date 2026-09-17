import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonClasses, getPageItems } from "@/components/ui";
import { cn } from "@/lib/cn";

export type CatalogPaginationProps = {
  page: number;
  pages: number;
  /** Builds the href for a page, keeping the current query. */
  hrefFor: (page: number) => string;
  className?: string;
};

/** Link-based pagination (works without JavaScript and is crawlable), styled like the admin kit Pagination. */
export default function CatalogPagination({ page, pages, hrefFor, className }: CatalogPaginationProps) {
  if (pages <= 1) return null;
  const current = Math.min(Math.max(1, page), pages);

  const edge = (target: number, label: string, disabled: boolean, icon: ReactNode) =>
    disabled ? (
      <span aria-disabled="true" className={buttonClasses({ variant: "outline", size: "icon", className: "pointer-events-none h-11 w-11 opacity-50 md:h-9 md:w-9" })}>
        {icon}
        <span className="sr-only">{label}</span>
      </span>
    ) : (
      <Link href={hrefFor(target)} rel={target < current ? "prev" : "next"} className={buttonClasses({ variant: "outline", size: "icon", className: "h-11 w-11 md:h-9 md:w-9" })}>
        {icon}
        <span className="sr-only">{label}</span>
      </Link>
    );

  return (
    <nav aria-label="Pagination" className={cn("flex flex-wrap items-center justify-center gap-1", className)}>
      {edge(current - 1, "Previous page", current === 1, <ChevronLeft aria-hidden="true" />)}
      {getPageItems(current, pages).map((item) =>
        typeof item === "number" ? (
          <Link
            key={item}
            href={hrefFor(item)}
            aria-label={`Page ${item}`}
            aria-current={item === current ? "page" : undefined}
            className={buttonClasses({
              variant: item === current ? "primary" : "ghost",
              size: "icon",
              className: "h-11 w-11 tabular-nums md:h-9 md:w-9",
            })}
          >
            {item}
          </Link>
        ) : (
          <span key={item} aria-hidden="true" className="px-1 text-slate-400">
            …
          </span>
        )
      )}
      {edge(current + 1, "Next page", current === pages, <ChevronRight aria-hidden="true" />)}
    </nav>
  );
}
