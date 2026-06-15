import { useCallback, useEffect, useMemo, useState } from "react";
import { adminRequest } from "../../utils/api";
import AdminLogin from "./components/AdminLogin";
import AdminShell from "./components/AdminShell";
import ContentManager from "./components/ContentManager";
import Dashboard from "./components/Dashboard";
import Operations from "./components/Operations";
import { loginTokenKey, modules } from "./constants/adminConstants";
import "./AdminApp.css";

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
  const activeModule = modules.find((module) => module.id === active);

  const load = useCallback(async (moduleId = active, { force = false } = {}) => {
    const loaders = moduleLoaders[moduleId] || [];
    const loadersToRun = force
      ? loaders
      : loaders.filter(([key]) => !loaded[key]);
    const shouldSkip = loadersToRun.length === 0;

    if (shouldSkip) return;

    setLoading(true);
    setError("");
    try {
      const responses = await Promise.all(
        loadersToRun.map(([, endpoint]) => adminRequest(endpoint))
      );

      const nextData = {};
      const nextLoaded = {};
      loadersToRun.forEach(([key], index) => {
        nextData[key] = responses[index].data || (key === "services" ? {} : []);
        nextLoaded[key] = true;
      });

      setData((state) => ({ ...state, ...nextData }));
      setLoaded((state) => ({ ...state, ...nextLoaded }));
    } catch (event) {
      setError(event.message);
      if (event.message?.toLowerCase().includes("authorization")) {
        localStorage.removeItem(loginTokenKey);
        setToken("");
      }
    } finally {
      setLoading(false);
    }
  }, [active, loaded]);

  const refresh = useCallback(() => load(active, { force: true }), [active, load]);
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

  const screen = useMemo(() => {
    if (active === "dashboard") {
      return <Dashboard data={data} setActive={setActive} />;
    }

    if (["packages", "services", "portfolio"].includes(active)) {
      return <ContentManager type={active} data={data} reload={refresh} />;
    }

    return <Operations type={active} data={data} reload={refresh} invalidate={invalidate} />;
  }, [active, data, refresh, invalidate]);

  useEffect(() => {
    if (token) load(active);
  }, [token, active, load]);

  if (!token) return <AdminLogin onLogin={setToken} />;

  return (
    <AdminShell
      active={active}
      setActive={setActive}
      activeModule={activeModule}
      load={refresh}
      setToken={setToken}
      loading={loading}
    >
      {error && <p className="admin-error">{error}</p>}
      {loading && <div className="admin-loading">Loading {activeModule?.label}...</div>}
      {screen}
    </AdminShell>
  );
};

export default AdminApp;
