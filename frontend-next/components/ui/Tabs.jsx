"use client";

import { useId, useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Tabs (segmented control). Controlled. Props: value, onChange(value), items ([{ value, label, icon?: lucide component,
 * count?: number, disabled? }]), "aria-label" (required), fullWidth (stretch triggers; use on mobile), id (prefix for
 * tab ids `${id}-tab-${value}` / panel ids `${id}-panel-${value}`), withPanels (set aria-controls; render <TabPanel>s
 * with the same id), className.
 * Keyboard: Arrow Left/Right, Home, End move focus and select (roving tabindex).
 */
export function Tabs({ value, onChange, items = [], id, withPanels = false, fullWidth = false, className, ...props }) {
  const autoId = useId();
  const baseId = id ?? `tabs-${autoId.replace(/:/g, "")}`;
  const refs = useRef([]);
  const enabled = items.map((item, index) => (item.disabled ? -1 : index)).filter((index) => index >= 0);
  const selectedIndex = items.findIndex((item) => item.value === value);
  const focusableIndex = selectedIndex >= 0 && !items[selectedIndex].disabled ? selectedIndex : enabled[0];

  const select = (index) => {
    const item = items[index];
    if (!item || item.disabled) return;
    refs.current[index]?.focus();
    if (item.value !== value) onChange?.(item.value);
  };

  const handleKeyDown = (event, index) => {
    const position = enabled.indexOf(index);
    let next;
    if (event.key === "ArrowRight") next = enabled[(position + 1) % enabled.length];
    else if (event.key === "ArrowLeft") next = enabled[(position - 1 + enabled.length) % enabled.length];
    else if (event.key === "Home") next = enabled[0];
    else if (event.key === "End") next = enabled[enabled.length - 1];
    if (next === undefined) return;
    event.preventDefault();
    select(next);
  };

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={cn(
        "inline-flex h-10 max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-1 text-slate-500",
        fullWidth && "flex w-full",
        className
      )}
      {...props}
    >
      {items.map((item, index) => {
        const selected = item.value === value;
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${item.value}`}
            aria-selected={selected}
            aria-controls={withPanels ? `${baseId}-panel-${item.value}` : undefined}
            tabIndex={index === focusableIndex ? 0 : -1}
            disabled={item.disabled}
            data-selected={selected || undefined}
            onClick={() => select(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:pointer-events-none disabled:opacity-50 data-[selected]:bg-white data-[selected]:text-slate-900 data-[selected]:shadow-sm",
              fullWidth && "flex-1"
            )}
          >
            {Icon && <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />}
            {item.label}
            {item.count != null && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums",
                  selected ? "bg-slate-100 text-slate-700" : "bg-slate-200/70 text-slate-500"
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * TabPanel. Props: id (same prefix passed to <Tabs id>), value (tab value), selected value via `active`,
 * className, children. Renders only when active.
 */
export function TabPanel({ id, value, active, className, children }) {
  if (!active) return null;
  return (
    <div
      role="tabpanel"
      id={`${id}-panel-${value}`}
      aria-labelledby={`${id}-tab-${value}`}
      tabIndex={0}
      className={cn("mt-4 focus-visible:outline-none", className)}
    >
      {children}
    </div>
  );
}

export default Tabs;
