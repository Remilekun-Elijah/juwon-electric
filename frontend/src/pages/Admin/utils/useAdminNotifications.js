import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminRequest } from "../../../utils/api";

// Polls messages and orders in the background so the console can flag new customer mail and new
// orders without a manual refresh. "Seen" state is per browser (localStorage).
const POLL_INTERVAL_MS = 45 * 1000;
const FOCUS_THROTTLE_MS = 10 * 1000;
const seenKey = "je/admin-seen";

const toTime = (value) => {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
};

const readSeen = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(seenKey) || "null");
    if (parsed && Number.isFinite(parsed.since) && parsed.items && typeof parsed.items === "object") return parsed;
  } catch {
    // Corrupt or blocked storage: start fresh.
  }
  // First run in this browser: only activity from now on counts as new.
  return { since: Date.now(), items: {} };
};

const writeSeen = (seen) => {
  try {
    localStorage.setItem(seenKey, JSON.stringify(seen));
  } catch {
    // Storage full or blocked; unread state just won't persist across reloads.
  }
};

const lastInboundAt = (contact) =>
  Math.max(
    toTime(contact.lastInboundReplyAt),
    ...(Array.isArray(contact.inboundReplies) ? contact.inboundReplies.map((reply) => toTime(reply.receivedAt)) : [0])
  );

const createdAt = (item) => toTime(item.receivedAt || item.createdAt);

// Latest server-side activity on a record, so "seen" never lags behind it when this device's clock is slow.
export const activityTime = (type, item) =>
  type === "contacts" ? Math.max(createdAt(item), lastInboundAt(item)) : createdAt(item);

// Returns { contacts: Map<id, "reply" | "message">, orders: Set<id> }.
export const computeUnread = (seen, contacts = [], orders = []) => {
  const unreadContacts = new Map();
  contacts.forEach((contact) => {
    const seenAt = seen.items[`contacts:${contact.id}`] ?? seen.since;
    if (lastInboundAt(contact) > seenAt) unreadContacts.set(contact.id, "reply");
    else if (createdAt(contact) > seenAt) unreadContacts.set(contact.id, "message");
  });
  const unreadOrders = new Set(
    orders.filter((order) => createdAt(order) > (seen.items[`orders:${order.id}`] ?? seen.since)).map((order) => order.id)
  );
  return { contacts: unreadContacts, orders: unreadOrders };
};

export const useAdminNotifications = ({ enabled, sessionRef, contacts, orders, onData }) => {
  const [seen, setSeen] = useState(readSeen);
  const lastPoll = useRef(0);
  const polling = useRef(false);
  const onDataRef = useRef(onData);
  onDataRef.current = onData;

  const poll = useCallback(async () => {
    if (!enabled || polling.current) return;
    polling.current = true;
    lastPoll.current = Date.now();
    const startedSession = sessionRef?.current;
    try {
      const [contactsResponse, ordersResponse] = await Promise.all([
        adminRequest("/contacts"),
        adminRequest("/orders"),
      ]);
      if (sessionRef && sessionRef.current !== startedSession) return;
      onDataRef.current?.({
        contacts: Array.isArray(contactsResponse.data) ? contactsResponse.data : [],
        orders: Array.isArray(ordersResponse.data) ? ordersResponse.data : [],
      });
    } catch {
      // Background check: a 401 is handled globally by adminRequest; other errors wait for the next tick.
    } finally {
      polling.current = false;
    }
  }, [enabled, sessionRef]);

  useEffect(() => {
    if (!enabled) return undefined;
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

  const updateSeen = useCallback((update) => {
    setSeen((current) => {
      const next = update(current);
      writeSeen(next);
      return next;
    });
  }, []);

  const markSeen = useCallback(
    (type, item) =>
      updateSeen((current) => ({
        ...current,
        items: { ...current.items, [`${type}:${item.id}`]: Math.max(Date.now(), activityTime(type, item)) },
      })),
    [updateSeen]
  );

  const latest = useRef({ contacts, orders });
  latest.current = { contacts, orders };
  const markAllSeen = useCallback(() => {
    const newest = Math.max(
      Date.now(),
      ...(latest.current.contacts || []).map((item) => activityTime("contacts", item)),
      ...(latest.current.orders || []).map((item) => activityTime("orders", item))
    );
    updateSeen(() => ({ since: newest, items: {} }));
  }, [updateSeen]);

  const unread = useMemo(() => computeUnread(seen, contacts, orders), [seen, contacts, orders]);

  // Drop per-record entries older than the global baseline so storage doesn't grow forever.
  useEffect(() => {
    const stale = Object.entries(seen.items).filter(([, time]) => time <= seen.since);
    if (stale.length) {
      updateSeen((current) => ({
        ...current,
        items: Object.fromEntries(Object.entries(current.items).filter(([, time]) => time > current.since)),
      }));
    }
  }, [seen, updateSeen]);

  return { unread, markSeen, markAllSeen, poll };
};

export default useAdminNotifications;
