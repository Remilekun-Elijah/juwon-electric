/**
 * Client-side pagination helper.
 * paginate(items, page, pageSize = 20) → { items, page, pageSize, totalItems, totalPages, start, end }
 * `page` is clamped to 1..totalPages; start/end are 1-based (0 when empty).
 */
export declare function paginate<T>(
  items?: T[],
  page?: number,
  pageSize?: number
): { items: T[]; page: number; pageSize: number; totalItems: number; totalPages: number; start: number; end: number };

/** Page numbers with ellipses: first, current ±1, last. Returns numbers and "ellipsis-start"/"ellipsis-end". */
export declare function getPageItems(page: number, totalPages: number): (number | "ellipsis-start" | "ellipsis-end")[];
