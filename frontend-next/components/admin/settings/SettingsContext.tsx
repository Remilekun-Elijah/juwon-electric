"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAdmin, useAdminQuery } from "@/components/admin/AdminContext";
import { ConfirmDialog } from "@/components/ui";
import { errorMessage } from "@/lib/admin/format";
import { ApiError, getSettings, saveSettings } from "@/lib/api/admin";
import type { SaveSection } from "./settingsLayout";

type SettingsQuery = ReturnType<typeof useAdminQuery<Awaited<ReturnType<typeof getSettings>>>>;

type SettingsContextValue = {
  settings: SettingsQuery;
  canRead: boolean;
  canWrite: boolean;
  /** Saves one section and replaces the shared settings with the server's response. */
  save: SaveSection;
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
  /** Bumped by Discard and after a save: section forms are keyed by it, so they reset from the saved values. */
  resetKey: number;
  discard: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("useSettings must be used inside the settings layout.");
  return value;
}

/** Links that leave the page in the same tab: the ones the unsaved-changes guard intercepts. */
function inAppLink(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return null;
  }
  const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download")) return null;
  if (anchor.target && anchor.target !== "_self") return null;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  if (url.pathname === window.location.pathname && url.search === window.location.search) return null;
  return anchor;
}

/**
 * Loads settings once for every page under /admin/settings (the layout keeps it mounted, so switching sections is
 * instant) and guards unsaved changes: in-app links ask first, closing or reloading the tab uses the browser prompt.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const { can } = useAdmin();
  const router = useRouter();
  const pathname = usePathname();
  const canRead = can("settings:read");
  const canWrite = can("settings:write");
  const settings = useAdminQuery("settings", getSettings, { enabled: canRead });
  const { setData } = settings;
  const [dirty, setDirty] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [pendingLink, setPendingLink] = useState<HTMLAnchorElement | null>(null);
  const leaving = useRef(false);

  useEffect(() => {
    leaving.current = false;
  }, [pathname]);

  useEffect(() => {
    if (!dirty) return undefined;
    const onClick = (event: MouseEvent) => {
      if (leaving.current) return;
      const anchor = inAppLink(event);
      if (!anchor) return;
      // Capture phase on document runs before React's handlers, so next/link never starts navigating.
      event.preventDefault();
      event.stopPropagation();
      setPendingLink(anchor);
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [dirty]);

  const leave = () => {
    const anchor = pendingLink;
    setPendingLink(null);
    if (!anchor) return;
    leaving.current = true;
    if (anchor.isConnected) {
      // Re-run the original click so the link's own handlers (for example closing the phone menu) still happen.
      anchor.click();
    } else {
      router.push(anchor.href);
    }
  };

  const save = useCallback<SaveSection>(
    async (input) => {
      try {
        const updated = await saveSettings(input);
        setData(() => updated);
        // Remount the form from the saved values, even when the server's response matches what was there before.
        setDirty(false);
        setResetKey((key) => key + 1);
        toast.success("Settings updated.");
        return true;
      } catch (error) {
        if (error instanceof ApiError && error.status === 400) return errorMessage(error);
        toast.error(errorMessage(error));
        return false;
      }
    },
    [setData]
  );

  const discard = useCallback(() => {
    setDirty(false);
    setResetKey((key) => key + 1);
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, canRead, canWrite, save, dirty, setDirty, resetKey, discard }),
    [settings, canRead, canWrite, save, dirty, resetKey, discard]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={Boolean(pendingLink)}
        onClose={() => setPendingLink(null)}
        onConfirm={leave}
        tone="warning"
        title="Unsaved changes"
        description="You have unsaved changes. Leave without saving?"
        confirmLabel="Leave without saving"
        cancelLabel="Keep editing"
      />
    </SettingsContext.Provider>
  );
}
