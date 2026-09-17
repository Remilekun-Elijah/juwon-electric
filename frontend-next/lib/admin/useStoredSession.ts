"use client";

import { useMemo, useSyncExternalStore } from "react";
import { ADMIN_SESSION_EVENT, ADMIN_SESSION_KEY, ADMIN_USER_KEY } from "@/lib/api/admin";
import type { AdminSelf } from "./capabilities";

const subscribe = (onChange: () => void) => {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === ADMIN_SESSION_KEY || event.key === ADMIN_USER_KEY) onChange();
  };
  window.addEventListener(ADMIN_SESSION_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(ADMIN_SESSION_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
};

const read = (key: string) => {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
};

/**
 * The stored admin session, kept in sync across tabs. `ready` is false during server rendering and hydration,
 * so the portal never renders admin UI (or redirects) before it has read localStorage.
 */
export function useStoredSession() {
  const token = useSyncExternalStore(subscribe, () => read(ADMIN_SESSION_KEY), () => null);
  const rawUser = useSyncExternalStore(subscribe, () => read(ADMIN_USER_KEY), () => null);

  const admin = useMemo<AdminSelf | null>(() => {
    if (!rawUser) return null;
    try {
      const parsed: unknown = JSON.parse(rawUser);
      return parsed && typeof parsed === "object" ? (parsed as AdminSelf) : null;
    } catch {
      return null;
    }
  }, [rawUser]);

  return { ready: token !== null, token: token || "", admin };
}
