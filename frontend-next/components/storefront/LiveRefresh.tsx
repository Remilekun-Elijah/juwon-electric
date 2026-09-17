"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { STOREFRONT_CHANNEL, type StorefrontRefreshMessage } from "@/lib/storefront/notify";

const INTERVAL_MS = 60_000;
const RETURN_AFTER_MS = 15_000;

/** A visitor is typing when focus is in a form control or editable region; refreshing then could disrupt them. */
const isTyping = () => {
  const active = document.activeElement;
  return (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    active instanceof HTMLSelectElement ||
    (active instanceof HTMLElement && active.isContentEditable)
  );
};

const isRefreshMessage = (data: unknown): data is StorefrontRefreshMessage =>
  Boolean(data) && typeof data === "object" && (data as { type?: unknown }).type === "refresh";

/**
 * Near-realtime storefront (docs/agents/fe-storefront.md §2.3). Re-renders the server components with
 * `router.refresh()`:
 * 1. when the tab becomes visible again and the last refresh was over 15 s ago,
 * 2. every 60 s while the tab is visible,
 * 3. straight away when the admin console in this browser broadcasts a change.
 * Skipped while the visitor is typing in a form; a broadcast that arrives then runs when focus leaves the field.
 * Mounted once in the storefront layout. Renders nothing.
 */
export default function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    let lastRefresh = Date.now();
    let pending = false;

    /** `deferWhileTyping`: remember the request and run it once focus leaves the field (broadcasts only). */
    const refresh = (deferWhileTyping = false) => {
      if (document.visibilityState !== "visible") {
        if (deferWhileTyping) pending = true;
        return;
      }
      if (isTyping()) {
        if (deferWhileTyping) pending = true;
        return;
      }
      pending = false;
      lastRefresh = Date.now();
      router.refresh();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && (pending || Date.now() - lastRefresh > RETURN_AFTER_MS)) refresh(pending);
    };

    const onFocusOut = () => {
      if (!pending) return;
      // Wait for focus to settle: moving between fields fires focusout before the next field gains focus.
      window.setTimeout(() => {
        if (pending) refresh(true);
      }, 0);
    };

    const interval = window.setInterval(() => {
      if (Date.now() - lastRefresh >= INTERVAL_MS - 1000) refresh();
    }, INTERVAL_MS);

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(STOREFRONT_CHANNEL);
      channel.onmessage = (event: MessageEvent) => {
        if (!isRefreshMessage(event.data)) return;
        refresh(true);
      };
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      window.clearInterval(interval);
      channel?.close();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, [router]);

  return null;
}
