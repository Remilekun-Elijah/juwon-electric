// Both backend runtimes behind one client interface, so every module test runs against
// Express (JSON store) and the Worker (D1 stand-in) and checks they answer the same.
//
//   const runtimes = await startRuntimes();
//   for (const rt of runtimes) { const res = await rt.api("GET", "/products"); }
//
// rt.api(method, path, { body, token }) -> { status, body }; token defaults to the static
// admin token (super admin). rt.createAdmin(role) -> { id, email, token } via a real login.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createD1 } from "./d1.js";

export const STATIC_TOKEN = "test-static-admin-token-0123456789abcdef";
const AUTH_SECRET = "test-admin-auth-secret-0123456789abcdefghij";
export const PASSWORD = "Correct-Horse-Battery-9";

let adminCounter = 0;
const nextEmail = (role) => `${role}.${Date.now()}.${(adminCounter += 1)}@staff.example.com`;

const startExpress = async () => {
  const dir = mkdtempSync(join(tmpdir(), "je-express-"));
  Object.assign(process.env, {
    BACKEND_NO_LISTEN: "true",
    JSON_STORE_PATH: join(dir, "db.json"),
    ADMIN_TOKEN: STATIC_TOKEN,
    ADMIN_AUTH_SECRET: AUTH_SECRET,
    TURNSTILE_DISABLED: "true",
    NODE_ENV: "test",
  });
  delete process.env.MONGODB_URI;
  delete process.env.MONGODB_DIRECT_URI;

  const { default: app } = await import("../../app.js");
  const store = await import("../../services/store.js");
  const auth = await import("../../services/adminAuthService.js");
  const runtime = await import("../../services/runtime.js");
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  const api = async (method, path, { body, token = STATIC_TOKEN, headers = {} } = {}) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    // Let tracked background work (audit, notifications) settle before the next call.
    await runtime.waitForPending(2000);
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };

  return {
    name: "express",
    api,
    store,
    async createAdmin(role, extra = {}) {
      const email = nextEmail(role);
      const admin = await store.createCollectionItem("admins", {
        name: `${role} user`,
        email,
        passwordHash: await auth.hashPassword(PASSWORD),
        role,
        isActive: true,
        passwordChangedAt: new Date(Date.now() - 60_000).toISOString(),
        ...extra,
      });
      const login = await api("POST", "/admin/auth/login", { body: { username: email, password: PASSWORD }, token: null });
      if (login.status !== 200) throw new Error(`express login failed: ${JSON.stringify(login.body)}`);
      return { id: admin.id, email, token: login.body.data.token };
    },
    async close() {
      await new Promise((resolve) => server.close(resolve));
      rmSync(dir, { recursive: true, force: true });
    },
  };
};

// Workers-only Web Crypto extension used by cloudflare/src/security.js.
const polyfillWorkerCrypto = async () => {
  if (typeof crypto.subtle.timingSafeEqual === "function") return;
  const { timingSafeEqual } = await import("node:crypto");
  crypto.subtle.timingSafeEqual = (a, b) =>
    a.byteLength === b.byteLength && timingSafeEqual(new Uint8Array(a), new Uint8Array(b));
};

const startWorker = async (envOverrides = {}) => {
  await polyfillWorkerCrypto();
  const { default: worker } = await import("../../cloudflare/src/index.js");
  const store = await import("../../cloudflare/src/store.js");
  const auth = await import("../../cloudflare/src/auth.js");
  const env = {
    DB: createD1(),
    ADMIN_TOKEN: STATIC_TOKEN,
    ADMIN_AUTH_SECRET: AUTH_SECRET,
    TURNSTILE_DISABLED: "true",
    ...envOverrides,
  };

  const api = async (method, path, { body, token = STATIC_TOKEN, headers = {} } = {}) => {
    const pending = [];
    const ctx = { waitUntil: (promise) => pending.push(promise), passThroughOnException() {} };
    const request = new Request(`https://api.test.local${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "CF-Connecting-IP": "203.0.113.10",
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const response = await worker.fetch(request, env, ctx);
    const text = await response.text();
    while (pending.length) await Promise.allSettled(pending.splice(0));
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };

  return {
    name: "worker",
    api,
    env,
    store,
    worker,
    async createAdmin(role, extra = {}) {
      const email = nextEmail(role);
      const admin = await store.createCollectionItem(env, "admins", {
        name: `${role} user`,
        email,
        passwordHash: await auth.hashPassword(PASSWORD),
        role,
        isActive: true,
        passwordChangedAt: new Date(Date.now() - 60_000).toISOString(),
        ...extra,
      });
      const login = await api("POST", "/admin/auth/login", { body: { username: email, password: PASSWORD }, token: null });
      if (login.status !== 200) throw new Error(`worker login failed: ${JSON.stringify(login.body)}`);
      return { id: admin.id, email, token: login.body.data.token };
    },
    async close() {
      env.DB.raw.close();
    },
  };
};

export const startRuntimes = async () => [await startExpress(), await startWorker()];

/**
 * Structural shape of a JSON value: object keys (sorted) and value types, arrays by
 * their first element. Used to assert both runtimes answer with the same shape.
 */
export const shapeOf = (value) => {
  if (value === null) return "null";
  if (Array.isArray(value)) return value.length ? [shapeOf(value[0])] : [];
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, shapeOf(value[key])])
    );
  }
  return typeof value;
};
