import type { Package } from "@/lib/api/types";
import { routes } from "@/lib/site";

export const PACKAGE_TABS = ["Tubular", "Lithium", "Hybrid Lithium"] as const;

/** Tab index for a package, as Packages.jsx groups them (anything else is hybrid). */
export const packageTabIndex = (item: Pick<Package, "type">) =>
  item.type === "tubular" ? 0 : item.type === "lithium" ? 1 : 2;

/** Detail URL: `/packages/[id]`. Package slugs repeat (e.g. "basic"), so the id is the route key. */
export const packagePath = (item: Pick<Package, "id">) => `${routes.packages}/${encodeURIComponent(String(item.id))}`;

/** "1.1kva tubular Basic package" style title for detail pages and metadata. */
export const packageTitle = (item: Package) => {
  const volt = item.volt ? ` ${item.volt}V` : "";
  const kind = item.type === "hybrid lithium" ? "hybrid inverter + lithium battery" : `inverter with ${item.type} battery`;
  return `${item.name} ${item.kva}kVA${volt} ${kind}`;
};

export type PackageHighlight = "gradient" | "diamond" | null;

/** Packages drawn with the gradient card in DisplayProduct.jsx. */
export const packageHighlight = (item: Pick<Package, "name">): PackageHighlight =>
  item.name === "Platinum" || item.name === "Premium" ? "gradient" : item.name === "Diamond" ? "diamond" : null;
