import Link from "next/link";
import { ArrowRight, BatteryCharging, Cable, Lightbulb, Package, PlugZap, Sun, Zap } from "lucide-react";
import type { CategoryNode } from "@/lib/catalog";
import { categoryPath } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { storeCard, storeFocus } from "@/lib/storefront/styles";

/** An everyday icon that matches the category name. */
function categoryIcon(name: string) {
  const value = name.toLowerCase();
  if (/batter/.test(value)) return BatteryCharging;
  if (/solar|panel/.test(value)) return Sun;
  if (/inverter/.test(value)) return Zap;
  if (/cable|wire/.test(value)) return Cable;
  if (/light|bulb|lamp/.test(value)) return Lightbulb;
  if (/charge|controller|stabili|protect|breaker|switch/.test(value)) return PlugZap;
  return Package;
}

const subcategoryLabel = (count: number) => (count === 1 ? "1 subcategory" : `${count} subcategories`);

/** "Shop by category": top-level categories with their subcategory counts. Server component. */
export default function CategoryGrid({ categories }: { categories: CategoryNode[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {categories.map((category) => {
        const Icon = categoryIcon(category.name);
        const children = category.children.length;
        return (
          <li key={category.id} className="min-w-0">
            <Link
              href={categoryPath(category)}
              className={cn(storeCard, "group flex h-full items-start gap-4 p-5 transition-shadow hover:shadow-elev-3", storeFocus)}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold tracking-tight text-slate-900 group-hover:text-brand-700">{category.name}</span>
                <span className="mt-1 block text-sm text-slate-500">
                  {children > 0 ? subcategoryLabel(children) : category.description ? <span className="line-clamp-2">{category.description}</span> : "Browse products"}
                </span>
              </span>
              <ArrowRight aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:text-brand-700 motion-safe:group-hover:translate-x-0.5" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
