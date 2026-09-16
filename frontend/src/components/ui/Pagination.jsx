/* eslint-disable react/prop-types */
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn";
import { Button } from "./Button";
import { getPageItems } from "./paginate";

/**
 * Pagination footer. Props: page (1-based), totalItems, pageSize (default 20), totalPages (optional, derived otherwise),
 * onChange(page), itemLabel (plural noun for "Showing 1–20 of 42 orders", default "items"), bordered (top divider, default
 * true), className. Renders nothing when totalItems is 0; hides page buttons when there is a single page.
 */
export function Pagination({
  page,
  totalItems,
  pageSize = 20,
  totalPages: totalPagesProp,
  onChange,
  itemLabel = "items",
  bordered = true,
  className,
}) {
  if (!totalItems) return null;

  const totalPages = totalPagesProp ?? Math.max(1, Math.ceil(totalItems / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, totalItems);
  const goTo = (next) => {
    if (next >= 1 && next <= totalPages && next !== current) onChange?.(next);
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between",
        bordered && "border-t border-slate-100",
        className
      )}
    >
      <p className="text-sm text-slate-500" aria-live="polite">
        Showing <span className="tabular-nums">{start}</span>–<span className="tabular-nums">{end}</span> of{" "}
        <span className="tabular-nums">{totalItems}</span> {itemLabel}
      </p>
      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={current === 1}
            onClick={() => goTo(current - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          {getPageItems(current, totalPages).map((item) =>
            typeof item === "number" ? (
              <Button
                key={item}
                variant={item === current ? "primary" : "ghost"}
                size="icon-sm"
                className="tabular-nums"
                aria-label={`Page ${item}`}
                aria-current={item === current ? "page" : undefined}
                onClick={() => goTo(item)}
              >
                {item}
              </Button>
            ) : (
              <span key={item} aria-hidden="true" className="px-2 text-slate-400">
                …
              </span>
            )
          )}
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={current === totalPages}
            onClick={() => goTo(current + 1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </nav>
      )}
    </div>
  );
}

export default Pagination;
