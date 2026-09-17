import Link from "next/link";
import { ChevronDown, Filter } from "lucide-react";
import type { Category } from "@/lib/api/types";
import { buildCategoryTree, categoryPath, categoryTrail, type CategoryNode } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { storeRoutes } from "@/lib/storefront/routes";
import { storeCard, storeFocus } from "@/lib/storefront/styles";

export type CategoryNavProps = {
  /** Flat active categories from `getStoreCategories`. */
  categories: Category[];
  /** Id of the category being viewed; leave out for all products. */
  activeId?: string | null;
  className?: string;
};

const linkClasses = (active: boolean, inTrail: boolean) =>
  cn(
    "flex min-h-11 items-center rounded-lg px-3 text-sm transition-colors lg:min-h-9",
    storeFocus,
    active
      ? "bg-brand-50 font-semibold text-brand-700"
      : inTrail
        ? "font-medium text-slate-900 hover:bg-slate-50"
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
  );

function Tree({ nodes, activeId, trail, depth }: { nodes: CategoryNode[]; activeId?: string | null; trail: Set<string>; depth: number }) {
  return (
    <ul className={cn("space-y-0.5", depth > 0 && "ml-3 mt-0.5 border-l border-slate-100 pl-2")}>
      {nodes.map((node) => {
        const active = node.id === activeId;
        return (
          <li key={node.id}>
            <Link href={categoryPath(node)} aria-current={active ? "page" : undefined} className={linkClasses(active, trail.has(node.id))}>
              {node.name}
            </Link>
            {node.children.length > 0 && <Tree nodes={node.children} activeId={activeId} trail={trail} depth={depth + 1} />}
          </li>
        );
      })}
    </ul>
  );
}

function NavList({ categories, activeId }: { categories: Category[]; activeId?: string | null }) {
  const tree = buildCategoryTree(categories);
  const trail = new Set(categoryTrail(categories, activeId).map((category) => category.id));
  return (
    <div className="space-y-0.5">
      <Link href={storeRoutes.products} aria-current={!activeId ? "page" : undefined} className={linkClasses(!activeId, false)}>
        All products
      </Link>
      <Tree nodes={tree} activeId={activeId} trail={trail} depth={0} />
    </div>
  );
}

/**
 * Category tree with the active category highlighted. A disclosure (`<details>`, no JavaScript) below `lg`; an
 * always-open sidebar card from `lg`. Server component.
 */
export default function CategoryNav({ categories, activeId, className }: CategoryNavProps) {
  if (!categories.length) return null;
  const activeName = activeId ? categories.find((category) => category.id === activeId)?.name : undefined;

  return (
    <div className={className}>
      <details className={cn(storeCard, "group lg:hidden")}>
        <summary
          className={cn(
            "flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 text-sm font-medium text-slate-900 [&::-webkit-details-marker]:hidden",
            storeFocus
          )}
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            <Filter aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-700" />
            <span className="truncate">
              Categories<span className="text-slate-500">: {activeName ?? "All products"}</span>
            </span>
          </span>
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
        </summary>
        <nav aria-label="Product categories" className="border-t border-slate-100 p-2">
          <NavList categories={categories} activeId={activeId} />
        </nav>
      </details>

      <nav aria-label="Product categories" className={cn(storeCard, "hidden p-3 lg:block")}>
        <h2 className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Categories</h2>
        <NavList categories={categories} activeId={activeId} />
      </nav>
    </div>
  );
}
