/* eslint-disable react/prop-types */
import { Close, Logout, Menu, Refresh } from "@mui/icons-material";
import { useEffect, useRef, useState } from "react";
import { ILogoImg } from "../../../utils/icon";
import {
  adminUserKey,
  loginTokenKey,
  modules,
} from "../constants/adminConstants";

const AdminShell = ({
  active,
  setActive,
  activeModule,
  load,
  setToken,
  loading,
  children,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const touchStart = useRef(null);

  const closeDrawer = () => setDrawerOpen(false);
  const openDrawer = () => setDrawerOpen(true);

  const handleTouchStart = (event) => {
    const touch = event.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      drawerOpen,
    };
  };

  const handleTouchEnd = (event) => {
    if (!touchStart.current) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = Math.abs(touch.clientY - touchStart.current.y);
    const mostlyHorizontal = Math.abs(deltaX) > 70 && deltaY < 55;

    if (mostlyHorizontal && touchStart.current.drawerOpen && deltaX < 0) {
      closeDrawer();
    }

    if (
      mostlyHorizontal &&
      !touchStart.current.drawerOpen &&
      touchStart.current.x < 28 &&
      deltaX > 0
    ) {
      openDrawer();
    }

    touchStart.current = null;
  };

  useEffect(() => {
    document.body.classList.toggle("admin-drawer-locked", drawerOpen);
    return () => document.body.classList.remove("admin-drawer-locked");
  }, [drawerOpen]);

  return (
    <main
      className={`admin-shell ${drawerOpen ? "admin-drawer-open" : ""}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        className="admin-drawer-backdrop"
        aria-label="Close admin navigation"
        onClick={closeDrawer}
      />

      <aside className="admin-sidebar" aria-label="Admin navigation">
        <div className="admin-brand">
          <img src={ILogoImg} alt="Juwon Electric" />
          <div>
            <strong>Admin</strong>
            <span>Operations Console</span>
          </div>
          <button
            className="admin-drawer-close"
            aria-label="Close admin navigation"
            onClick={closeDrawer}
          >
            <Close />
          </button>
        </div>
        <nav>
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <button
                key={module.id}
                className={active === module.id ? "active" : ""}
                onClick={() => {
                  setActive(module.id);
                  closeDrawer();
                }}
              >
                <Icon /> {module.label}
              </button>
            );
          })}
        </nav>
        <button
          className="admin-logout"
          onClick={() => {
            localStorage.removeItem(loginTokenKey);
            localStorage.removeItem(adminUserKey);
            setToken("");
          }}
        >
          <Logout /> Sign out
        </button>
      </aside>

      <section className="admin-main">
        <header className="admin-header">
          <div className="admin-header-title">
            <button
              className="admin-menu-button"
              aria-label="Open admin navigation"
              onClick={openDrawer}
            >
              <Menu />
            </button>
            <div>
              <span>Juwon Electric Admin</span>
              <h1>{activeModule?.label}</h1>
            </div>
          </div>
          <button onClick={load} disabled={loading}>
            <Refresh /> {loading ? "Loading" : "Refresh"}
          </button>
        </header>

        {children}
      </section>
    </main>
  );
};

export default AdminShell;
