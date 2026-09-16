// End-to-end: boots the Express app on a throwaway JSON store and checks role
// gating and admin user management over HTTP.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";

const SUPER = { email: "owner@juwon.test", password: "Correct-Horse-Battery-9" };
const PASSWORD = "Another-Strong-Passw0rd";

let child;
let dir;
let base;

const freePort = () =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });

const call = async (method, path, { token, body } = {}) => {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json() };
};

const login = async (username, password) => {
  const { status, body } = await call("POST", "/admin/auth/login", { body: { username, password } });
  assert.equal(status, 200, JSON.stringify(body));
  return body.data;
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "je-admin-users-"));
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ["app.js"], {
    cwd: new URL("..", import.meta.url),
    env: {
      PATH: process.env.PATH,
      NODE_ENV: "test",
      PORT: String(port),
      JSON_STORE_PATH: join(dir, "db.json"),
      ADMIN_AUTH_SECRET: "test-signing-secret-0123456789abcdefghijkl",
      SUPERADMIN_EMAIL: SUPER.email,
      SUPERADMIN_PASSWORD: SUPER.password,
      TURNSTILE_DISABLED: "true",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => (output += chunk));
  child.stderr.on("data", (chunk) => (output += chunk));
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      await fetch(`${base}/health`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`server did not start:\n${output}`);
});

after(async () => {
  child?.kill("SIGTERM");
  await new Promise((resolve) => child?.once("exit", resolve));
  if (dir) await rm(dir, { recursive: true, force: true });
});

test("role gating and user management", async () => {
  const owner = await login(SUPER.email, SUPER.password);
  assert.equal(owner.admin.role, "superadmin");
  assert.ok(owner.admin.capabilities.includes("users:write"));

  const me = await call("GET", "/admin/auth/me", { token: owner.token });
  assert.equal(me.status, 200);
  assert.equal(me.body.data.email, SUPER.email);

  // Unauthenticated -> 401.
  assert.equal((await call("GET", "/admin/users")).status, 401);

  // Create a sales and an admin account.
  const sales = await call("POST", "/admin/users", {
    token: owner.token,
    body: { name: "Sales", email: "Sales@Juwon.test", role: "sales", password: PASSWORD },
  });
  assert.equal(sales.status, 201, JSON.stringify(sales.body));
  assert.equal(sales.body.data.email, "sales@juwon.test");
  assert.equal(sales.body.data.passwordHash, undefined);

  const duplicate = await call("POST", "/admin/users", {
    token: owner.token,
    body: { name: "Again", email: "sales@juwon.test", role: "support", password: PASSWORD },
  });
  assert.equal(duplicate.status, 409);

  const badRole = await call("POST", "/admin/users", {
    token: owner.token,
    body: { name: "X", email: "x@juwon.test", role: "root", password: PASSWORD },
  });
  assert.equal(badRole.status, 400);

  const admin = await call("POST", "/admin/users", {
    token: owner.token,
    body: { name: "Admin", email: "admin@juwon.test", role: "admin", password: PASSWORD },
  });
  assert.equal(admin.status, 201);

  // Sales: orders yes, catalog writes / users / audit no.
  const salesSession = await login("sales@juwon.test", PASSWORD);
  assert.equal((await call("GET", "/admin/orders", { token: salesSession.token })).status, 200);
  assert.equal((await call("GET", "/admin/users", { token: salesSession.token })).status, 403);
  assert.equal((await call("GET", "/admin/audit-logs", { token: salesSession.token })).status, 403);
  assert.equal(
    (await call("POST", "/admin/packages", { token: salesSession.token, body: {} })).status,
    403
  );

  // Admin: manages non-privileged accounts only.
  const adminSession = await login("admin@juwon.test", PASSWORD);
  assert.equal((await call("GET", "/admin/users", { token: adminSession.token })).status, 200);
  const promote = await call("PUT", `/admin/users/${sales.body.data.id}/role`, {
    token: adminSession.token,
    body: { role: "admin" },
  });
  assert.equal(promote.status, 403);
  const toSupport = await call("PUT", `/admin/users/${sales.body.data.id}/role`, {
    token: adminSession.token,
    body: { role: "support" },
  });
  assert.equal(toSupport.status, 200);
  assert.equal(toSupport.body.data.role, "support");
  // Takes effect on the existing session: support cannot write orders.
  assert.equal(
    (await call("PUT", "/admin/orders/nope", { token: salesSession.token, body: {} })).status,
    403
  );

  const ownerId = owner.admin.id;
  assert.equal(
    (await call("POST", `/admin/users/${ownerId}/deactivate`, { token: adminSession.token })).status,
    403
  );

  // The last active super admin cannot demote or deactivate themselves.
  assert.equal(
    (await call("POST", `/admin/users/${ownerId}/deactivate`, { token: owner.token })).status,
    403
  );

  // Deactivation revokes sessions; reactivation restores sign-in.
  const off = await call("POST", `/admin/users/${sales.body.data.id}/deactivate`, {
    token: adminSession.token,
  });
  assert.equal(off.status, 200);
  assert.equal(off.body.data.isActive, false);
  assert.equal((await call("GET", "/admin/auth/me", { token: salesSession.token })).status, 401);
  const on = await call("POST", `/admin/users/${sales.body.data.id}/reactivate`, {
    token: adminSession.token,
  });
  assert.equal(on.status, 200);
  await login("sales@juwon.test", PASSWORD);

  // Audited.
  const logs = await call("GET", "/admin/audit-logs?entity=user", { token: owner.token });
  const actions = logs.body.data.items.map((item) => item.action);
  for (const action of ["user.create", "user.role_change", "user.deactivate", "user.reactivate"]) {
    assert.ok(actions.includes(action), `missing audit ${action}: ${actions}`);
  }
});
