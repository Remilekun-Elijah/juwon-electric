/* eslint-disable react/prop-types */
import { useState } from "react";
import { apiRequest } from "../../../utils/api";
import { adminUserKey, loginTokenKey } from "../constants/adminConstants";
import { ILogoImg } from "../../../utils/icon";

const AdminLogin = ({ onLogin }) => {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    username: "",
    password: "",
    token: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key, value) => setForm((state) => ({ ...state, [key]: value }));

  const login = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await apiRequest("/admin/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: form.username,
          password: form.password,
        }),
      });
      localStorage.removeItem("je/admin-token");
      localStorage.setItem(loginTokenKey, response.data.token);
      localStorage.setItem(adminUserKey, JSON.stringify(response.data.admin));
      onLogin(response.data.token);
    } catch (event) {
      setError(event.message);
    } finally {
      setLoading(false);
    }
  };

  const requestReset = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await apiRequest("/admin/auth/request-password-reset", {
        method: "POST",
        body: JSON.stringify({ username: form.username }),
      });
      setMessage(
        response.data?.resetToken
          ? `Reset token: ${response.data.resetToken}`
          : response.message
      );
      setMode("reset");
    } catch (event) {
      setError(event.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const response = await apiRequest("/admin/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          username: form.username,
          token: form.token,
          password: form.password,
        }),
      });
      setMessage(response.message);
      setForm({ username: form.username, password: "", token: "", confirmPassword: "" });
      setMode("login");
    } catch (event) {
      setError(event.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-login">
      <section className="admin-login-panel">
        <img src={ILogoImg} alt="Juwon Electric" />
        <h1>Admin Console</h1>
        <p>
          {mode === "login"
            ? "Sign in with your admin username and password."
            : mode === "forgot"
            ? "Enter your admin username to generate a reset token."
            : "Enter the reset token and choose a new password."}
        </p>

        {error && <span className="admin-login-error">{error}</span>}
        {message && <span className="admin-login-message">{message}</span>}

        {mode === "login" && (
          <form onSubmit={login} className="admin-login-form">
            <input
              type="email"
              value={form.username}
              onChange={(event) => update("username", event.target.value)}
              placeholder="Username or email"
              required
            />
            <input
              type="password"
              value={form.password}
              onChange={(event) => update("password", event.target.value)}
              placeholder="Password"
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? "Signing in" : "Sign in"}
            </button>
            <button type="button" className="admin-login-link" onClick={() => setMode("forgot")}>
              Reset password
            </button>
          </form>
        )}

        {mode === "forgot" && (
          <form onSubmit={requestReset} className="admin-login-form">
            <input
              type="email"
              value={form.username}
              onChange={(event) => update("username", event.target.value)}
              placeholder="Username or email"
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? "Generating" : "Generate reset token"}
            </button>
            <button type="button" className="admin-login-link" onClick={() => setMode("login")}>
              Back to login
            </button>
          </form>
        )}

        {mode === "reset" && (
          <form onSubmit={resetPassword} className="admin-login-form">
            <input
              type="email"
              value={form.username}
              onChange={(event) => update("username", event.target.value)}
              placeholder="Username or email"
              required
            />
            <input
              type="text"
              value={form.token}
              onChange={(event) => update("token", event.target.value)}
              placeholder="Reset token"
              required
            />
            <input
              type="password"
              value={form.password}
              onChange={(event) => update("password", event.target.value)}
              placeholder="New password"
              required
              minLength={8}
            />
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(event) => update("confirmPassword", event.target.value)}
              placeholder="Confirm new password"
              required
              minLength={8}
            />
            <button type="submit" disabled={loading}>
              {loading ? "Resetting" : "Reset password"}
            </button>
            <button type="button" className="admin-login-link" onClick={() => setMode("login")}>
              Back to login
            </button>
          </form>
        )}
      </section>
    </main>
  );
};

export default AdminLogin;
