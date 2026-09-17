"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { settingsGroups, settingsSections, type SettingsSectionId } from "./sections";

/** Desktop (lg+): grouped left rail beside the section content, in the admin sidebar's style. */
export function SettingsRail({ active }: { active: SettingsSectionId }) {
  return (
    <nav aria-label="Settings sections" className="hidden lg:block">
      <div className="sticky top-24 space-y-6">
        {settingsGroups.map((group) => {
          const items = settingsSections.filter((section) => section.group === group.id);
          const headingId = `settings-nav-${group.id}`;
          return (
            <div key={group.id}>
              <p id={headingId} className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </p>
              <ul aria-labelledby={headingId} className="space-y-1">
                {items.map((section) => {
                  const current = section.id === active;
                  const Icon = section.icon;
                  return (
                    <li key={section.id}>
                      <Link
                        href={section.href}
                        aria-current={current ? "page" : undefined}
                        className={cn(
                          "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500",
                          current
                            ? "bg-brand-50 text-brand-700 before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-sm before:bg-brand-600"
                            : "text-slate-600 hover:bg-white hover:text-slate-900"
                        )}
                      >
                        <Icon
                          aria-hidden="true"
                          className={cn(
                            "h-[18px] w-[18px] shrink-0",
                            current ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600"
                          )}
                        />
                        <span className="truncate">{section.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

/** Phones and tablets: a horizontally scrolling row of pills; the current one is scrolled into view. */
export function SettingsPills({ active }: { active: SettingsSectionId }) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const current = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!list || !current) return;
    // Scroll only the pill row (scrollIntoView could also scroll the page).
    const offset = current.offsetLeft - list.offsetLeft - (list.clientWidth - current.offsetWidth) / 2;
    list.scrollLeft = Math.max(0, offset);
  }, [active]);

  return (
    <nav aria-label="Settings sections" className="min-w-0 lg:hidden">
      <ul
        ref={listRef}
        className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]"
      >
        {settingsSections.map((section) => {
          const current = section.id === active;
          const Icon = section.icon;
          return (
            <li key={section.id} className="shrink-0">
              <Link
                href={section.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500",
                  current
                    ? "border-brand-200 bg-brand-50 text-brand-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon aria-hidden="true" className={cn("h-4 w-4 shrink-0", current ? "text-brand-600" : "text-slate-400")} />
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
