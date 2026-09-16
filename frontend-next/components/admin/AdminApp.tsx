"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Spinner } from "@/components/ui";
import { capabilitiesFor, type AdminSelf, type Capability } from "@/lib/admin/capabilities";
import { AUTH_PATHS, getModuleForPath } from "@/lib/admin/modules";
import { useAdminNotifications } from "@/lib/admin/useAdminNotifications";
import { useStoredSession } from "@/lib/admin/useStoredSession";
import {
  clearAdminSession,
  getSession,
  logout,
  readAdminToken,
  saveAdminUser,
  setAdminForbiddenHandler,
  setAdminUnauthorizedHandler,
} from "@/lib/api/admin";
import { AdminContext, type AdminContextValue } from "./AdminContext";
import { AdminShell } from "./AdminShell";
import { NewActivityBanner } from "./NewActivityBanner";

const FullPageSpinner = () => (
  <div className="grid min-h-screen place-items-center bg-slate-50">
    <Spinner label="Loading the admin" />
  </div>
);

const loginHref = (pathname: string) =>
  pathname && pathname !== "/admin" ? `/admin/login?next=${encodeURIComponent(pathname)}` : "/admin/login";

/** Client shell for everything under /admin: session check, 401/403 handling, notifications and navigation. */
export function AdminApp({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/admin";
  const router = useRouter();
  const { ready, token, admin } = useStoredSession();
  const isAuthPage = AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  // The one place a rejected session is cleared: every adminFetch that gets a 401 for the current token calls this.
  useEffect(
    () =>
      setAdminUnauthorizedHandler(() => {
        clearAdminSession();
        router.replace(loginHref(window.location.pathname));
      }),
    [router]
  );

  useEffect(() => {
    if (ready && !token && !isAuthPage) router.replace(loginHref(pathname));
  }, [ready, token, isAuthPage, pathname, router]);

  // Remove the unread count from the tab title when leaving the admin.
  useEffect(() => () => {
    document.title = document.title.replace(/^\(\d+\)\s+/, "");
  }, []);

  // The root layout mounts the only <Toaster /> (FE_CONVENTIONS §3.5).
  if (isAuthPage) return <>{children}</>;

  if (!ready || !token) return <FullPageSpinner />;

  return (
    <SignedIn key={token} token={token} storedAdmin={admin}>
      {children}
    </SignedIn>
  );
}

function SignedIn({ token, storedAdmin, children }: { token: string; storedAdmin: AdminSelf | null; children: ReactNode }) {
  const pathname = usePathname() || "/admin";
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [sessionChecked, setSessionChecked] = useState(false);
  const refreshing = useRef<Promise<void> | null>(null);

  const refreshSession = useCallback(() => {
    if (!refreshing.current) {
      refreshing.current = getSession()
        .then((fresh) => {
          if (fresh && readAdminToken() === token) saveAdminUser(fresh);
        })
        .catch(() => {
          // 401 is handled globally; anything else keeps the stored identity.
        })
        .finally(() => {
          refreshing.current = null;
          setSessionChecked(true);
        });
    }
    return refreshing.current;
  }, [token]);

  // Refresh the identity (role and capabilities) on load and after any 403.
  useEffect(() => {
    refreshSession();
    return setAdminForbiddenHandler(() => {
      refreshSession();
    });
  }, [refreshSession]);

  const admin: AdminSelf = useMemo(
    () => storedAdmin ?? { id: "", name: "Admin", email: "", role: "" },
    [storedAdmin]
  );
  const capabilities = useMemo(() => capabilitiesFor(admin), [admin]);
  const can = useCallback((capability: Capability) => capabilities.has(capability), [capabilities]);

  const signOut = useCallback(() => {
    // Revoke the server session best effort; adminFetch reads the token before storage is cleared.
    logout().catch(() => {});
    clearAdminSession();
    router.replace("/admin/login");
  }, [router]);

  const notifications = useAdminNotifications({
    contactsEnabled: can("leads:read"),
    ordersEnabled: can("orders:read"),
  });
  const { unread, ready: readsReady, contacts, orders, markAllSeen, poll } = notifications;

  const unreadSummary = useMemo(() => {
    let replies = 0;
    let messages = 0;
    unread.contacts.forEach((kind) => {
      if (kind === "reply") replies += 1;
      else messages += 1;
    });
    return { replies, messages, orders: unread.orders.size, total: replies + messages + unread.orders.size };
  }, [unread]);

  // Toast when something new arrives while the portal is open (not for what was already unread on load).
  const announced = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!readsReady) {
      announced.current = null;
      return;
    }
    const current = new Set([
      ...[...unread.contacts.entries()].map(([id, kind]) => `contacts:${id}:${kind}`),
      ...[...unread.orders].map((id) => `orders:${id}`),
    ]);
    if (announced.current) {
      const previous = announced.current;
      const fresh = [...current].filter((key) => !previous.has(key));
      fresh.slice(0, 3).forEach((key) => {
        const [type, id, kind] = key.split(":");
        const list: { id: string; name?: string; emailAddress?: string }[] = (type === "orders" ? orders : contacts) || [];
        const record = list.find((item) => item.id === id);
        const who = record?.name || record?.emailAddress || "a customer";
        const title =
          type === "orders" ? `New order from ${who}` : kind === "reply" ? `New reply from ${who}` : `New message from ${who}`;
        toast.info(title, {
          action: { label: "View", onClick: () => router.push(type === "orders" ? "/admin/orders" : "/admin/contacts") },
        });
      });
      if (fresh.length > 3) toast.info(`${fresh.length - 3} more new items`);
    }
    announced.current = current;
  }, [unread, readsReady, contacts, orders, router]);

  // Unread count in the browser tab title.
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s+/, "");
    document.title = unreadSummary.total ? `(${unreadSummary.total}) ${base}` : base;
  }, [unreadSummary.total, pathname]);

  const counts = useMemo(
    () => ({
      orders: orders?.filter((order) => !["completed", "cancelled"].includes(order.status)).length,
      contacts: contacts?.filter((contact) => (contact.status || "new") === "new" || unread.contacts.has(contact.id)).length,
    }),
    [orders, contacts, unread]
  );

  const refresh = useCallback(() => {
    setRefreshKey((key) => key + 1);
    poll();
  }, [poll]);

  const context = useMemo<AdminContextValue>(
    () => ({ admin, can, signOut, refreshSession, refreshKey, refresh, notifications }),
    [admin, can, signOut, refreshSession, refreshKey, refresh, notifications]
  );

  // No stored capabilities yet (first load, or a pre-contract login response): wait for /auth/me before gating.
  if (!Array.isArray(storedAdmin?.capabilities) && !sessionChecked) return <FullPageSpinner />;

  const active = getModuleForPath(pathname);

  return (
    <AdminContext.Provider value={context}>
      <AdminShell
        activeId={active?.id ?? null}
        counts={counts}
        onRefresh={refresh}
        onSignOut={signOut}
        banner={
          <NewActivityBanner
            replies={unreadSummary.replies}
            messages={unreadSummary.messages}
            orders={unreadSummary.orders}
            onViewMessages={() => router.push("/admin/contacts")}
            onViewOrders={() => router.push("/admin/orders")}
            onDismiss={markAllSeen}
          />
        }
      >
        {children}
      </AdminShell>
    </AdminContext.Provider>
  );
}
