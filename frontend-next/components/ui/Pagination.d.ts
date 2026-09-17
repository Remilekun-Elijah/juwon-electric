import type { ReactElement } from "react";

/**
 * Pagination footer. Props: page (1-based), totalItems, pageSize (default 20), totalPages (optional, derived otherwise),
 * onChange(page), itemLabel (plural noun for "Showing 1–20 of 42 orders", default "items"), bordered (top divider, default
 * true), className. Renders nothing when totalItems is 0; hides page buttons when there is a single page.
 */
export declare function Pagination(props: {
  page: number;
  totalItems: number;
  pageSize?: number;
  totalPages?: number;
  onChange?: (page: number) => void;
  itemLabel?: string;
  bordered?: boolean;
  className?: string;
}): ReactElement | null;

export default Pagination;
