"use client";

import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { AdminSelf, Capability } from "@/lib/admin/capabilities";
import { getMockedServerSnapshot, getMockedSnapshot, subscribeMocked } from "@/lib/admin/mocks";
import type { useAdminNotifications } from "@/lib/admin/useAdminNotifications";

export type AdminNotificationsState = ReturnType<typeof useAdminNotifications>;

export type AdminContextValue = {
  admin: AdminSelf;
  can: (capability: Capability) => boolean;
  signOut: () => void;
  /** Refetches `/admin/auth/me` (after a 403, a role change may have hidden things). */
  refreshSession: () => Promise<void>;
  /** Bumped by the header refresh button; `useAdminQuery` reloads when it changes. */
  refreshKey: number;
  refresh: () => void;
  notifications: AdminNotificationsState;
};

export const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const value = useContext(AdminContext);
  if (!value) throw new Error("useAdmin must be used inside the admin shell.");
  return value;
}

/** Areas currently served by contract mocks (see lib/admin/mocks.ts). */
export function useMockedAreas() {
  return useSyncExternalStore(subscribeMocked, getMockedSnapshot, getMockedServerSnapshot);
}

type QueryState<T> = { key: string; data: T | undefined; error: string };

/**
 * Loads data for an admin screen. Reloads when `key` changes, when `reload()` is called and when the header
 * refresh button is pressed. Previous data stays visible while a reload is in flight.
 */
export function useAdminQuery<T>(key: string, loader: () => Promise<T>, { enabled = true } = {}) {
  const { refreshKey } = useAdmin();
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<QueryState<T>>({ key: "", data: undefined, error: "" });
  const loaderRef = useRef(loader);
  const requestKey = `${key}|${refreshKey}|${tick}`;

  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    loaderRef.current().then(
      (data) => {
        if (active) setState({ key: requestKey, data, error: "" });
      },
      (error: unknown) => {
        if (active) {
          setState((current) => ({
            key: requestKey,
            data: current.data,
            error: error instanceof Error ? error.message : "Something went wrong.",
          }));
        }
      }
    );
    return () => {
      active = false;
    };
  }, [requestKey, enabled]);

  return {
    data: state.data,
    error: state.error,
    loading: enabled && state.key !== requestKey,
    /** True until the first response (success or error) arrives. */
    initialLoading: enabled && state.key === "",
    reload: () => setTick((value) => value + 1),
    /** Local update after a mutation, without refetching. */
    setData: (update: (current: T | undefined) => T | undefined) =>
      setState((current) => ({ ...current, data: update(current.data) })),
  };
}
