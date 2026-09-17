"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

type TabProps = {
  navMenu: string[];
  active: number;
  setActive: (index: number) => void;
  /** Prefix for tab/panel ids so a panel can use aria-labelledby. */
  id?: string;
  className?: string;
};

/**
 * About-section pill tabs. Port of frontend/src/components/Tab.jsx (MUI Typography → button).
 * Adds roving tabindex and arrow-key navigation.
 */
export default function Tab({ navMenu, active, setActive, id = "tabs", className }: TabProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const last = navMenu.length - 1;
    const next =
      event.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : event.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : -1;
    if (next < 0) return;
    event.preventDefault();
    setActive(next);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" className={cn("flex flex-wrap justify-center gap-x-5 gap-y-3 lg:justify-start", className)}>
      {navMenu.map((label, index) => {
        const selected = active === index;
        return (
          <button
            key={label}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-controls={`${id}-panel`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => setActive(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
            // The active tab has a 2px border; inactive tabs get 2px more padding so the size never jumps.
            className={cn(
              "inter-bold cursor-pointer rounded-lg text-sm leading-6 transition-shadow duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 md:text-base",
              selected
                ? "border-2 border-white bg-brand-500 px-5 py-2 text-white shadow-lg"
                : "bg-transparent px-[22px] py-[10px] text-brand-500"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
