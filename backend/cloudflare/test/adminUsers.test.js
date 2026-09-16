import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { OWNER, PASSWORD, TEST_ENV, runAdminUsersScenario } from "../../test/scenarios/adminUsers.js";
import { hashPassword } from "../src/auth.js";
import { D1Stub, applyMigrations } from "./helpers/d1.js";
import { createWorkerClient } from "./helpers/worker.js";

const MIGRATION_0007 = readFileSync(new URL("../migrations/0007_admin_roles.sql", import.meta.url), "utf8");

const insertAdmin = (d1, id, data) =>
  d1.db
    .prepare(
      "INSERT INTO records (id, collection, slug, data, is_active, sort_order, created_at, updated_at) VALUES (?, 'admins', NULL, ?, 1, 0, ?, ?)"
    )
    .run(id, JSON.stringify({ id, ...data }), "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z");

test("Worker: roles, capability gating and admin users", async () => {
  const { request } = createWorkerClient(TEST_ENV);
  await runAdminUsersScenario(request);
});

test("Worker: unknown role signs in but holds no capabilities", async () => {
  const client = createWorkerClient(TEST_ENV);
  insertAdmin(client.env.DB, "nobody", {
    name: "Nobody",
    email: "nobody@juwon.test",
    role: "customer",
    passwordHash: await hashPassword(PASSWORD),
    isActive: true,
  });
  const login = await client.request("POST", "/admin/auth/login", {
    body: { username: "nobody@juwon.test", password: PASSWORD },
  });
  assert.equal(login.status, 200);
  assert.deepEqual(login.body.data.admin.capabilities, []);
  assert.equal((await client.request("GET", "/admin/auth/me", { token: login.body.data.token })).status, 200);
  assert.equal((await client.request("GET", "/admin/orders", { token: login.body.data.token })).status, 403);
});

test("migration 0007 rewrites legacy roles on a database at 0006 and is idempotent", () => {
  const d1 = applyMigrations(new D1Stub(), { upTo: 6 });
  d1.db.exec(readFileSync(new URL("../seed.sql", import.meta.url), "utf8"));
  insertAdmin(d1, "legacy", { email: OWNER.email, role: "super_admin" });
  insertAdmin(d1, "sales", { email: "sales@juwon.test", role: "sales" });
  d1.db
    .prepare("INSERT INTO records (id, collection, data, created_at, updated_at) VALUES ('o1', 'orders', ?, 'x', 'x')")
    .run(JSON.stringify({ id: "o1", role: "super_admin" }));

  d1.db.exec(MIGRATION_0007);
  d1.db.exec(MIGRATION_0007);

  const roles = Object.fromEntries(
    d1.db
      .prepare("SELECT id, json_extract(data, '$.role') AS role FROM records WHERE id IN ('legacy', 'sales', 'o1')")
      .all()
      .map((row) => [row.id, row.role])
  );
  assert.deepEqual(roles, { legacy: "superadmin", sales: "sales", o1: "super_admin" });

  assert.throws(() => insertAdmin(d1, "dupe", { email: "SALES@juwon.test", role: "support" }), /UNIQUE/);
});

test("migration 0007 fails loudly on duplicate admin emails and keeps the data", () => {
  const d1 = applyMigrations(new D1Stub(), { upTo: 6 });
  insertAdmin(d1, "a", { email: "same@juwon.test", role: "sales" });
  insertAdmin(d1, "b", { email: "Same@juwon.test", role: "support" });
  assert.throws(() => d1.db.exec(MIGRATION_0007), /UNIQUE/);
  assert.equal(d1.db.prepare("SELECT COUNT(*) AS n FROM records WHERE collection = 'admins'").get().n, 2);
});
