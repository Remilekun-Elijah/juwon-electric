import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminRequest } from "../../../utils/api";

// Polls messages and orders in the background so the console can flag new customer mail and new
// orders without a manual refresh. Read status lives on the server (per admin, shared across devices);
// if the API doesn't support it yet, it falls back to this browser's localStorage.
const POLL_INTERVAL_MS = 45 * 1000;
const FOCUS_THROTTLE_MS = 10 * 1000;
const localSeenKey = "je/admin-seen";

const toTime = (value) => {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
};

const lastInboundAt = (contact) =>
  Math.max(
    toTime(contact.lastInboundReplyAt),
    ...(Array.isArray(contact.inboundReplies) ? contact.inboundReplies.map((reply) => toTime(reply.receivedAt)) : [0])
  );

const createdAt = (item) => toTime(item.receivedAt || item.createdAt);

// Latest activity on a record, so "read" never lags behind it when this device's clock is slow.
export const activityTime = (type, item) =>
  type === "contacts" ? Math.max(createdAt(item), lastInboundAt(item)) : createdAt(item);

// Returns { contacts: Map<id, "reply" | "message">, orders: Set<id> }.
export const computeUnread = (seen, contacts = [], orders = []) => {
  const unreadContacts = new Map();
  const unreadOrders = new Set();
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

const isValidSeen = (value) =>
  Boolean(value) && Number.isFinite(value.since) && value.items && typeof value.items === "object";

const readLocalSeen = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(localSeenKey) || "null");
    if (isValidSeen(parsed)) return parsed;
  } catch {
    // Corrupt or blocked storage: start fresh.
  }
  return { since: Date.now(), items: {} };
};

const writeLocalSeen = (seen) => {
  try {
    localStorage.setItem(localSeenKey, JSON.stringify(seen));
  } catch {
    // Storage full or blocked; read state just won't persist in this browser.
  }
};

// Server state wins, but keep newer optimistic marks made while a request was in flight.
export const mergeSeen = (current, incoming) => {
  if (!current) return incoming;
  const since = Math.max(current.since, incoming.since);
  const items = {};
  [current.items, incoming.items].forEach((source) =>
    Object.entries(source).forEach(([key, time]) => {
      if (Number.isFinite(time) && time > since) items[key] = Math.max(items[key] || 0, time);
    })
  );
  return { since, items };
};

export const useAdminNotifications = ({ enabled, sessionRef, contacts, orders, onData }) => {
  const [seen, setSeen] = useState(null);
  const mode = useRef(null); // "server" | "local" | null while loading
  const lastPoll = useRef(0);
  const polling = useRef(false);
  const onDataRef = useRef(onData);
  onDataRef.current = onData;
  const latest = useRef({ contacts, orders });
  latest.current = { contacts, orders };

  const isCurrent = useCallback(
    (startedSession) => !sessionRef || sessionRef.current === startedSession,
    [sessionRef]
  );

  const loadReadState = useCallback(async () => {
    const startedSession = sessionRef?.current;
    try {
      const response = await adminRequest("/reads");
      if (!isCurrent(startedSession)) return;
      if (isValidSeen(response.data)) {
        const wasServer = mode.current === "server";
        mode.current = "server";
        setSeen((current) => mergeSeen(wasServer ? current : null, response.data));
        return;
      }
    } catch (error) {
      if (!isCurrent(startedSession) || error.status === 401) return;
      if (mode.current === "server") return; // transient failure: keep the last server state
    }
    // Older API without read-status endpoints: remember reads in this browser only.
    mode.current = "local";
    setSeen((current) => current || readLocalSeen());
  }, [sessionRef, isCurrent]);

  const poll = useCallback(async () => {
    if (!enabled || polling.current) return;
    polling.current = true;
    lastPoll.current = Date.now();
    const startedSession = sessionRef?.current;
    try {
      const [contactsResponse, ordersResponse] = await Promise.all([
        adminRequest("/contacts"),
        adminRequest("/orders"),
        mode.current === "local" ? null : loadReadState(),
      ]);
      if (!isCurrent(startedSession)) return;
      onDataRef.current?.({
        contacts: Array.isArray(contactsResponse.data) ? contactsResponse.data : [],
        orders: Array.isArray(ordersResponse.data) ? ordersResponse.data : [],
      });
    } catch {
      // Background check: a 401 is handled globally by adminRequest; other errors wait for the next tick.
    } finally {
      polling.current = false;
    }
  }, [enabled, sessionRef, isCurrent, loadReadState]);

  useEffect(() => {
    if (!enabled) {
      mode.current = null;
      setSeen(null);
      return undefined;
    }
    poll();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") poll();
    }, POLL_INTERVAL_MS);
    const onFocus = () => {
      if (document.visibilityState === "visible" && Date.now() - lastPoll.current > FOCUS_THROTTLE_MS) poll();
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled, poll]);

  const applyLocal = useCallback((update) => {
    setSeen((current) => {
      const next = update(current || { since: Date.now(), items: {} });
      if (mode.current === "local") writeLocalSeen(next);
      return next;
    });
  }, []);

  const markSeen = useCallback(
    (type, item) => {
      const key = `${type}:${item.id}`;
      const readAt = Math.max(Date.now(), activityTime(type, item));
      applyLocal((current) => ({
        ...current,
        items: { ...current.items, [key]: Math.max(current.items[key] || 0, readAt) },
      }));
      if (mode.current !== "server") return;
      const startedSession = sessionRef?.current;
      adminRequest("/reads", { method: "POST", body: JSON.stringify({ type, id: item.id }) })
        .then((response) => {
          const serverReadAt = Number(response.data?.readAt);
          if (!isCurrent(startedSession) || !Number.isFinite(serverReadAt)) return;
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
    [applyLocal, sessionRef, isCurrent]
  );

  const markAllSeen = useCallback(() => {
    const newest = Math.max(
      Date.now(),
      ...(latest.current.contacts || []).map((item) => activityTime("contacts", item)),
      ...(latest.current.orders || []).map((item) => activityTime("orders", item))
    );
    applyLocal((current) => ({ since: Math.max(current.since, newest), items: {} }));
    if (mode.current !== "server") return;
    const startedSession = sessionRef?.current;
    adminRequest("/reads/all", { method: "POST", body: JSON.stringify({}) })
      .then((response) => {
        if (isCurrent(startedSession) && isValidSeen(response.data)) {
          setSeen((current) => mergeSeen(current, response.data));
        }
      })
      .catch(() => {
        // Kept as read locally; the next poll re-syncs with the server.
      });
  }, [applyLocal, sessionRef, isCurrent]);

  const unread = useMemo(() => computeUnread(seen, contacts, orders), [seen, contacts, orders]);

  return { unread, ready: seen !== null, markSeen, markAllSeen, poll };
};

export default useAdminNotifications;
