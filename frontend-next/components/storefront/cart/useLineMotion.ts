"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { motionDisabled } from "@/components/storefront/motion/motion";
import { staggerDelay } from "@/lib/storefront/styles";

/** How long a removed line's leaving copy stays (its collapse animation is 250ms). */
const LEAVE_MS = 300;

export type LineRow<T> = { key: string; item: T; ghost: boolean };

type Ghost<T> = { key: string; item: T; index: number };

/**
 * Presentation-only motion for cart lines (TEAM_AND_MOTION_V1 §8.2 Cart). It never touches the cart store: callers keep
 * their add, remove and undo logic exactly as it is and only tell this hook when a line is being removed.
 *
 * - Lines on screen when the list first renders rise in 30ms apart (200ms each, so under 300ms in total).
 * - A removed line is gone from the store at once, but a copy stays in its place for 300ms, inert and hidden from
 *   assistive technology, while its height folds away and it fades. Under reduced motion there is no copy.
 * - A line that comes back after a removal (Undo) slides in from the right.
 */
export function useLineMotion<T>(items: T[], keyOf: (item: T) => string) {
  const [initialKeys] = useState(() => new Set(items.map(keyOf)));
  const [removedKeys, setRemovedKeys] = useState<ReadonlySet<string>>(() => new Set());
  const [ghosts, setGhosts] = useState<Ghost<T>[]>([]);

  useEffect(() => {
    if (!ghosts.length) return;
    const timer = setTimeout(() => setGhosts([]), LEAVE_MS);
    return () => clearTimeout(timer);
  }, [ghosts]);

  /** Call from the Remove handler, before the store removal. */
  const leave = (item: T) => {
    const key = keyOf(item);
    setRemovedKeys((current) => new Set(current).add(key));
    if (motionDisabled()) return;
    const index = items.findIndex((line) => keyOf(line) === key);
    if (index === -1) return;
    setGhosts((current) => [...current.filter((ghost) => ghost.key !== key), { key, item, index }]);
  };

  const rows: LineRow<T>[] = items.map((item) => ({ key: keyOf(item), item, ghost: false }));
  for (const ghost of [...ghosts].sort((a, b) => a.index - b.index)) {
    if (rows.some((row) => !row.ghost && row.key === ghost.key)) continue;
    rows.splice(Math.min(ghost.index, rows.length), 0, { key: ghost.key, item: ghost.item, ghost: true });
  }

  /** Entrance class and delay for a live line at `position`. */
  const enter = (key: string, position: number): { className: string; style?: CSSProperties } => {
    if (removedKeys.has(key)) return { className: "je-in je-in-fast je-in-right" };
    if (initialKeys.has(key)) return { className: "je-in je-in-fast", style: staggerDelay(position, 30, 0, 4) };
    return { className: "je-in je-in-fast" };
  };

  return { rows, leave, enter };
}
