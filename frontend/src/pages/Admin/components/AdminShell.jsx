/* eslint-disable react/prop-types */
import { Logout, Refresh } from "@mui/icons-material";
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
}) => (
  <main className="admin-shell">
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <img src={ILogoImg} alt="Juwon Electric" />
        <div>
          <strong>Admin</strong>
          <span>Operations Console</span>
        </div>
      </div>
      <nav>
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <button
              key={module.id}
              className={active === module.id ? "active" : ""}
              onClick={() => setActive(module.id)}
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
        <div>
          <span>Juwon Electric Admin</span>
          <h1>{activeModule?.label}</h1>
        </div>
        <button onClick={load} disabled={loading}>
          <Refresh /> {loading ? "Loading" : "Refresh"}
        </button>
      </header>

      {children}
    </section>
  </main>
);

export default AdminShell;
