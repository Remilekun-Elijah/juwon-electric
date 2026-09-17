"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type OptionScope = { selected: number; select: (index: number) => void };

const OptionScopeContext = createContext<OptionScope | null>(null);

/**
 * Shares the chosen package option (its ORIGINAL index into `pkg.options`) between the option picker in the buy panel
 * and the "What's included" lists elsewhere on the package page. Server-rendered children pass straight through.
 */
export function PackageOptionScope({ defaultIndex, children }: { defaultIndex: number; children: ReactNode }) {
  const [selected, select] = useState(defaultIndex);
  return <OptionScopeContext.Provider value={{ selected, select }}>{children}</OptionScopeContext.Provider>;
}

/** The shared selection, or `null` outside a PackageOptionScope. */
export const usePackageOptionScope = () => useContext(OptionScopeContext);

/**
 * Shows its (server-rendered) children only while option `index` is selected. Every option's panel is in the HTML;
 * the default option is visible before hydration and without JavaScript.
 */
export function PackageOptionPanel({ index, defaultIndex, children }: { index: number; defaultIndex: number; children: ReactNode }) {
  const scope = usePackageOptionScope();
  const selected = scope ? scope.selected : defaultIndex;
  return <div hidden={selected !== index}>{children}</div>;
}
