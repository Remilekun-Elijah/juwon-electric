/**
 * Client-side pagination helper.
 * paginate(items, page, pageSize = 20) → { items, page, pageSize, totalItems, totalPages, start, end }
 * `page` is clamped to 1..totalPages; start/end are 1-based (0 when empty).
 */
export function paginate(items = [], page = 1, pageSize = 20) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const offset = (current - 1) * pageSize;
  return {
    items: items.slice(offset, offset + pageSize),
    page: current,
    pageSize,
    totalItems,
    totalPages,
    start: totalItems ? offset + 1 : 0,
    end: Math.min(offset + pageSize, totalItems),
  };
}

/** Page numbers with ellipses: first, current ±1, last. Returns numbers and "ellipsis-start"/"ellipsis-end". */
export function getPageItems(page, totalPages) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (page >= totalPages - 2) [totalPages - 3, totalPages - 2, totalPages - 1].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result = [];
  sorted.forEach((p, index) => {
    const prev = sorted[index - 1];
    if (prev && p - prev > 1) result.push(p < page ? "ellipsis-start" : "ellipsis-end");
    result.push(p);
  });
  return result;
}
