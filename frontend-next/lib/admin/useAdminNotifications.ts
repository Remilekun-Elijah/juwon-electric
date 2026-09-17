"use client";

/**
 * Port of the Vite admin's useAdminNotifications. Polls messages and orders in the background so the portal can
 * flag new customer mail and orders without a manual refresh. Read status lives on the server (`/admin/reads`,
 * per admin); if the API doesn't support it, it falls back to this browser's localStorage (`je/admin-seen`).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminFetch } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import type { Order } from "@/lib/api/types";

const POLL_INTERVAL_MS = 45 * 1000;
const FOCUS_THROTTLE_MS = 10 * 1000;
const LOCAL_SEEN_KEY = "je/admin-seen";

export type Contact = {
  id: string;
  name?: string;
  emailAddress?: string;
  phoneNumber?: string;
  message?: string;
  status?: string;
  note?: string;
  receivedAt?: string;
  createdAt?: string;
  lastInboundReplyAt?: string;
  inboundReplies?: { receivedAt?: string; [key: string]: unknown }[];
  replies?: unknown[];
  [key: string]: unknown;
};

export type ReadType = "contacts" | "orders";
export type Seen = { since: number; items: Record<string, number> };
export type Unread = { contacts: Map<string, "reply" | "message">; orders: Set<string> };

type Timestamped = { receivedAt?: string; createdAt?: string };

const toTime = (value: unknown) => {
  const time = new Date((value as string) || 0).getTime();
  return Number.isFinite(time) ? time : 0;
};

const lastInboundAt = (contact: Contact) =>
  Math.max(
    toTime(contact.lastInboundReplyAt),
    ...(Array.isArray(contact.inboundReplies) ? contact.inboundReplies.map((reply) => toTime(reply.receivedAt)) : [0])
  );

const createdAt = (item: Timestamped) => toTime(item.receivedAt || item.createdAt);

/** Latest activity on a record, so "read" never lags behind it when this device's clock is slow. */
export const activityTime = (type: ReadType, item: Contact | Order) =>
  type === "contacts" ? Math.max(createdAt(item), lastInboundAt(item as Contact)) : createdAt(item);

export const computeUnread = (seen: Seen | null, contacts: Contact[] = [], orders: Order[] = []): Unread => {
  const unreadContacts = new Map<string, "reply" | "message">();
  const unreadOrders = new Set<string>();
  if (!seen) return { contacts: unreadContacts, orders: unreadOrders };
  contacts.forEach((contact) => {
    const seenAt = seen.items[`contacts:${contact.id}`] ?? seen.since;
    if (lastInboundAt(contact) > seenAt) unreadContacts.set(contact.id, "reply");
    else if (createdAt(contact) > seenAt) unreadContacts.set(contact.id, "message");
  });
  orders.forEach((order) => {
    if (createdAt(order) > (seen.items[`orders:${order.id}`] ?? seen.since)) unreadOrders.add(order.id);
  });
  return { contacts: unreadContacts, orders: unreadOrders };
};

const isValidSeen = (value: unknown): value is Seen =>
  Boolean(value) &&
  Number.isFinite((value as Seen).since) &&
  Boolean((value as Seen).items) &&
  typeof (value as Seen).items === "object";

const readLocalSeen = (): Seen => {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(LOCAL_SEEN_KEY) || "null");
    if (isValidSeen(parsed)) return parsed;
  } catch {
    // Corrupt or blocked storage: start fresh.
  }
  return { since: Date.now(), items: {} };
};

const writeLocalSeen = (seen: Seen) => {
  try {
    window.localStorage.setItem(LOCAL_SEEN_KEY, JSON.stringify(seen));
  } catch {
    // Storage full or blocked; read state just won't persist in this browser.
  }
};

/** Server state wins, but keep newer optimistic marks made while a request was in flight. */
export const mergeSeen = (current: Seen | null, incoming: Seen): Seen => {
  if (!current) return incoming;
  const since = Math.max(current.since, incoming.since);
  const items: Record<string, number> = {};
  [current.items, incoming.items].forEach((source) =>
    Object.entries(source).forEach(([key, time]) => {
      if (Number.isFinite(time) && time > since) items[key] = Math.max(items[key] || 0, time);
    })
  );
  return { since, items };
};

type Options = {
  /** Poll messages (needs `leads:read`). */
  contactsEnabled: boolean;
  /** Poll orders (needs `orders:read`). */
  ordersEnabled: boolean;
};

/**
 * Mount once per signed-in session (AdminApp keys it by token), so state never leaks between sessions.
 * Returns the polled lists too, so the shell can show counts without refetching.
 */
export function useAdminNotifications({ contactsEnabled, ordersEnabled }: Options) {
  const enabled = contactsEnabled || ordersEnabled;
  const [seen, setSeen] = useState<Seen | null>(null);
  const [contacts, setContacts] = useState<Contact[] | undefined>(undefined);
  const [orders, setOrders] = useState<Order[] | undefined>(undefined);
  const mode = useRef<"server" | "local" | null>(null);
  const lastPoll = useRef(0);
  const polling = useRef(false);
  const alive = useRef(true);
  const latest = useRef<{ contacts?: Contact[]; orders?: Order[] }>({});

  useEffect(() => {
    latest.current = { contacts, orders };
  }, [contacts, orders]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const loadReadState = useCallback(async () => {
    try {
      const response = await adminFetch<Seen>("/reads");
      if (!alive.current) return;
      if (isValidSeen(response.data)) {
        const wasServer = mode.current === "server";
        mode.current = "server";
        setSeen((current) => mergeSeen(wasServer ? current : null, response.data));
        return;
      }
    } catch (error) {
      if (!alive.current || (error instanceof ApiError && (error.status === 401 || error.status === 403))) return;
      if (mode.current === "server") return; // transient failure: keep the last server state
    }
    // Older API without read-status endpoints: remember reads in this browser only.
    mode.current = "local";
    setSeen((current) => current || readLocalSeen());
  }, []);

  const poll = useCallback(async () => {
    if (!enabled || polling.current) return;
    polling.current = true;
    lastPoll.current = Date.now();
    try {
      const [contactsResponse, ordersResponse] = await Promise.all([
        contactsEnabled ? adminFetch<Contact[]>("/contacts") : null,
        ordersEnabled ? adminFetch<Order[]>("/orders") : null,
        mode.current === "local" ? null : loadReadState(),
      ]);
      if (!alive.current) return;
      if (contactsResponse) setContacts(Array.isArray(contactsResponse.data) ? contactsResponse.data : []);
      if (ordersResponse) setOrders(Array.isArray(ordersResponse.data) ? ordersResponse.data : []);
    } catch {
      // Background check: 401s are handled globally by adminFetch; other errors wait for the next tick.
    } finally {
      polling.current = false;
    }
  }, [enabled, contactsEnabled, ordersEnabled, loadReadState]);

  useEffect(() => {
    if (!enabled) return undefined;
    const first = window.setTimeout(poll, 0);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") poll();
    }, POLL_INTERVAL_MS);
    const onFocus = () => {
      if (document.visibilityState === "visible" && Date.now() - lastPoll.current > FOCUS_THROTTLE_MS) poll();
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled, poll]);

  const applyLocal = useCallback((update: (current: Seen) => Seen) => {
    setSeen((current) => {
      const next = update(current || { since: Date.now(), items: {} });
      if (mode.current === "local") writeLocalSeen(next);
      return next;
    });
  }, []);

  const markSeen = useCallback(
    (type: ReadType, item: Contact | Order) => {
      const key = `${type}:${item.id}`;
      const readAt = Math.max(Date.now(), activityTime(type, item));
      applyLocal((current) => ({
        ...current,
        items: { ...current.items, [key]: Math.max(current.items[key] || 0, readAt) },
      }));
      if (mode.current !== "server") return;
      adminFetch<{ key: string; readAt: number }>("/reads", {
        method: "POST",
        body: { type, id: item.id },
      })
        .then((response) => {
          const serverReadAt = Number(response.data?.readAt);
          if (!alive.current || !Number.isFinite(serverReadAt)) return;
          setSeen((current) =>
            current
              ? { ...current, items: { ...current.items, [key]: Math.max(current.items[key] || 0, serverReadAt) } }
              : current
          );
        })
        .catch(() => {
          // Kept as read locally; the next poll re-syncs with the server.
        });
    },
    [applyLocal]
  );

  const markAllSeen = useCallback(() => {
    const newest = Math.max(
      Date.now(),
      ...(latest.current.contacts || []).map((item) => activityTime("contacts", item)),
      ...(latest.current.orders || []).map((item) => activityTime("orders", item))
    );
    applyLocal((current) => ({ since: Math.max(current.since, newest), items: {} }));
    if (mode.current !== "server") return;
    adminFetch<Seen>("/reads/all", { method: "POST", body: {} })
      .then((response) => {
        if (alive.current && isValidSeen(response.data)) setSeen((current) => mergeSeen(current, response.data));
      })
      .catch(() => {
        // Kept as read locally; the next poll re-syncs with the server.
      });
  }, [applyLocal]);

  const unread = useMemo(() => computeUnread(seen, contacts, orders), [seen, contacts, orders]);

  return { unread, ready: seen !== null, contacts, orders, markSeen, markAllSeen, poll };
}
