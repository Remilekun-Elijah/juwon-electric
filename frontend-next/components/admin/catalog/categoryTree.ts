import type { Category } from "@/lib/api/types";

export type CategoryNode = { category: Category; depth: number };

const byOrder = (a: Category, b: Category) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);

/**
 * Flattens the flat `GET /admin/categories` list into tree order (parents before children, `sortOrder` then name).
 * Categories whose parent is missing are shown as roots so nothing disappears.
 */
export function flattenCategoryTree(categories: readonly Category[]): CategoryNode[] {
  const ids = new Set(categories.map((item) => item.id));
  const children = new Map<string, Category[]>();
  const roots: Category[] = [];
  for (const item of categories) {
    if (item.parentId && ids.has(item.parentId) && item.parentId !== item.id) {
      const list = children.get(item.parentId) ?? [];
      list.push(item);
      children.set(item.parentId, list);
    } else {
      roots.push(item);
    }
  }

  const result: CategoryNode[] = [];
  const seen = new Set<string>();
  const walk = (items: Category[], depth: number) => {
    for (const item of [...items].sort(byOrder)) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      result.push({ category: item, depth });
      walk(children.get(item.id) ?? [], depth + 1);
    }
  };
  walk(roots, 0);
  // A cycle in bad data would leave records unvisited; list them at the root instead of hiding them.
  walk(
    categories.filter((item) => !seen.has(item.id)),
    0
  );
  return result;
}

/** The category and every category below it. */
export function descendantIds(categories: readonly Category[], id: string): Set<string> {
  const result = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const item of categories) {
      if (item.parentId && result.has(item.parentId) && !result.has(item.id)) {
        result.add(item.id);
        grew = true;
      }
    }
  }
  return result;
}

/** Select options in tree order, indented by depth. */
export function categoryOptions(categories: readonly Category[], exclude?: ReadonlySet<string>) {
  return flattenCategoryTree(categories)
    .filter(({ category }) => !exclude?.has(category.id))
    .map(({ category, depth }) => ({
      value: category.id,
      label: `${"  ".repeat(depth)}${depth ? "– " : ""}${category.name}${category.isActive ? "" : " (inactive)"}`,
    }));
}

let rowSequence = 0;

/** Stable React keys for editable rows. */
export const nextRowId = () => {
  rowSequence += 1;
  return `row-${rowSequence}`;
};
