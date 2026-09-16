import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminRequest, setAdminUnauthorizedHandler } from "../../utils/api";
import ActivityLog from "./components/ActivityLog";
import AdminLogin from "./components/AdminLogin";
import AdminShell from "./components/AdminShell";
import NewActivityBanner from "./components/NewActivityBanner";
import ContentManager from "./components/ContentManager";
import Dashboard from "./components/Dashboard";
import Operations from "./components/Operations";
import { AdminContext } from "./components/adminContext";
import { adminUserKey, loginTokenKey } from "./constants/adminConstants";
import { toast } from "../../components/ui";
import { useAdminNotifications } from "./utils/useAdminNotifications";

const moduleLoaders = {
  dashboard: [["dashboard", "/dashboard"]],
  packages: [["packages", "/packages"]],
  services: [["services", "/services"]],
  portfolio: [["portfolio", "/portfolio"]],
  orders: [["orders", "/orders"]],
  contacts: [["contacts", "/contacts"]],
  newsletter: [["newsletter", "/newsletter"]],
};

const AdminApp = () => {
  const [token, setToken] = useState(localStorage.getItem(loginTokenKey) || "");
  const [active, setActive] = useState("dashboard");
  const [data, setData] = useState({});
  const [loaded, setLoaded] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const pendingLoads = useRef(0);
  const session = useRef(0);

  const updateToken = useCallback((nextToken) => {
    if (!nextToken) {
      session.current += 1;
      setData({});
      setLoaded({});
      setError("");
    }
    setToken(nextToken);
  }, []);

  // The one place a rejected session is cleared: every adminRequest that gets a 401 calls this.
  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem(loginTokenKey);
    localStorage.removeItem(adminUserKey);
    updateToken("");
  }, [updateToken]);

  useEffect(() => setAdminUnauthorizedHandler(handleUnauthorized), [handleUnauthorized]);

  const signOut = useCallback(() => {
    // Revoke the server session best-effort. adminRequest reads the token synchronously,
    // so the request carries it even though local state is cleared right after.
    if (localStorage.getItem(loginTokenKey)) {
      adminRequest("/auth/logout", { method: "POST" }).catch(() => {});
    }
    handleUnauthorized();
  }, [handleUnauthorized]);

  const load = useCallback(async (moduleId = active, { force = false } = {}) => {
    const loaders = moduleLoaders[moduleId] || [];
    const loadersToRun = force
      ? loaders
      : loaders.filter(([key]) => !loaded[key]);
    const shouldSkip = loadersToRun.length === 0;

    if (shouldSkip) return;

    const currentSession = session.current;
    pendingLoads.current += 1;
    setLoading(true);
    setError("");
    try {
      const responses = await Promise.all(
        loadersToRun.map(([, endpoint]) => adminRequest(endpoint))
      );
      if (currentSession !== session.current) return;

      const nextData = {};
      const nextLoaded = {};
      loadersToRun.forEach(([key], index) => {
        nextData[key] = responses[index].data || (key === "services" ? {} : []);
        nextLoaded[key] = true;
      });

      setData((state) => ({ ...state, ...nextData }));
      setLoaded((state) => ({ ...state, ...nextLoaded }));
    } catch (event) {
      if (currentSession !== session.current) return;
      setError(event.message);
      if (event.status === 401 || event.message?.toLowerCase().includes("authorization")) {
        handleUnauthorized();
      }
    } finally {
      pendingLoads.current -= 1;
      if (pendingLoads.current === 0) setLoading(false);
    }
  }, [active, loaded, handleUnauthorized]);

  const refresh = useCallback(() => {
    setRefreshKey((key) => key + 1);
    return load(active, { force: true });
  }, [active, load]);
  const invalidateDashboard = useRef(null);
  const invalidate = useCallback((keys) => {
    const keyList = Array.isArray(keys) ? keys : [keys];
    setLoaded((state) => {
      const next = { ...state };
      keyList.forEach((key) => {
        delete next[key];
      });
      return next;
    });
  }, []);

  invalidateDashboard.current = () => invalidate(["dashboard"]);

  // Drops a deleted record from the loaded list without refetching it.
  const removeRecord = useCallback((key, id) => {
    setData((state) =>
      Array.isArray(state[key]) ? { ...state, [key]: state[key].filter((item) => item.id !== id) } : state
    );
  }, []);

  const syncFromPoll = useCallback(({ contacts, orders }) => {
    setData((state) => ({ ...state, contacts, orders }));
    setLoaded((state) => ({ ...state, contacts: true, orders: true }));
  }, []);

  const { unread, ready: readsReady, markSeen, markAllSeen } = useAdminNotifications({
    enabled: Boolean(token),
    sessionRef: session,
    contacts: data.contacts,
    orders: data.orders,
    onData: syncFromPoll,
  });

  const unreadSummary = useMemo(() => {
    let replies = 0;
    let messages = 0;
    unread.contacts.forEach((kind) => {
      if (kind === "reply") replies += 1;
      else messages += 1;
    });
    return { replies, messages, orders: unread.orders.size, total: replies + messages + unread.orders.size };
  }, [unread]);

  // Toast when something new arrives while the console is open (not for what was already unread on load).
  const announced = useRef(null);
  useEffect(() => {
    if (!readsReady || !data.contacts || !data.orders) {
      if (!readsReady) announced.current = null;
      return;
    }
    const current = new Set([
      ...[...unread.contacts.entries()].map(([id, kind]) => `contacts:${id}:${kind}`),
      ...[...unread.orders].map((id) => `orders:${id}`),
    ]);
    if (announced.current) {
      const fresh = [...current].filter((key) => !announced.current.has(key));
      fresh.slice(0, 3).forEach((key) => {
        const [type, id, kind] = key.split(":");
        const record = (data[type] || []).find((item) => item.id === id);
        const who = record?.name || record?.emailAddress || "a customer";
        const title =
          type === "orders" ? `New order from ${who}` : kind === "reply" ? `New reply from ${who}` : `New message from ${who}`;
        toast.info(title, {
          action: { label: "View", onClick: () => setActive(type) },
        });
      });
      if (fresh.length > 3) toast.info(`${fresh.length - 3} more new items`);
      if (fresh.length) invalidateDashboard.current?.();
    }
    announced.current = current;
  }, [unread, data, readsReady]);

  // Unread count in the browser tab title.
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s+/, "");
    document.title = token && unreadSummary.total ? `(${unreadSummary.total}) ${base}` : base;
  }, [token, unreadSummary.total]);

  const counts = useMemo(() => {
    const pendingOrders = data.orders
      ? data.orders.filter((order) => !["completed", "cancelled"].includes(order.status)).length
      : data.dashboard?.stats?.pendingOrders;
    const newMessages = data.contacts
      ? data.contacts.filter((contact) => (contact.status || "new") === "new" || unread.contacts.has(contact.id)).length
      : undefined;
    return { orders: pendingOrders, contacts: newMessages };
  }, [data.orders, data.contacts, data.dashboard, unread]);

  const context = useMemo(
    () => ({ loading, error, loaded, refresh }),
    [loading, error, loaded, refresh]
  );

  const screen = useMemo(() => {
    if (active === "dashboard") {
      return <Dashboard data={data} setActive={setActive} />;
    }

    if (active === "activity") {
      return <ActivityLog refreshKey={refreshKey} onUnauthorized={handleUnauthorized} />;
    }

    if (["packages", "services", "portfolio"].includes(active)) {
      return <ContentManager key={active} type={active} data={data} reload={refresh} />;
    }

    return (
      <Operations
        key={active}
        type={active}
        data={data}
        reload={refresh}
        invalidate={invalidate}
        removeRecord={removeRecord}
        unread={active === "contacts" ? unread.contacts : active === "orders" ? unread.orders : undefined}
        onSeen={markSeen}
      />
    );
  }, [active, data, refresh, invalidate, removeRecord, refreshKey, handleUnauthorized, unread, markSeen]);

  useEffect(() => {
    if (token) load(active);
  }, [token, active, load]);

  // The public site's global CSS sets its own body font; portalled dialogs, drawers and toasts render
  // outside the admin root, so give <body> the admin typography while the admin is mounted.
  useEffect(() => {
    const classes = ["font-sans", "antialiased", "text-slate-900"];
    document.body.classList.add(...classes);
    return () => document.body.classList.remove(...classes);
  }, []);

  if (!token) return <AdminLogin onLogin={updateToken} />;

  return (
    <AdminContext.Provider value={context}>
      <AdminShell
        active={active}
        setActive={setActive}
        counts={counts}
        onRefresh={refresh}
        onSignOut={signOut}
        loading={loading}
        banner={
          <NewActivityBanner
            replies={unreadSummary.replies}
            messages={unreadSummary.messages}
            orders={unreadSummary.orders}
            onViewMessages={() => setActive("contacts")}
            onViewOrders={() => setActive("orders")}
            onDismiss={markAllSeen}
          />
        }
      >
        {screen}
      </AdminShell>
    </AdminContext.Provider>
  );
};

export default AdminApp;
