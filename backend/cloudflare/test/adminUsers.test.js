import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { OWNER, PASSWORD, TEST_ENV, runAdminUsersScenario, runLastSuperadminRace } from "../../test/scenarios/adminUsers.js";
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

test("Worker: concurrent superadmin demotions never leave no active superadmin", async () => {
  await runLastSuperadminRace(createWorkerClient(TEST_ENV).request);
});

test("Worker: invite email uses the shared template with the admin link", async (t) => {
  const sent = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url) === "https://api.resend.com/emails") {
      sent.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ id: "00000000-0000-0000-0000-000000000000" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return realFetch(url, init);
  };
  t.after(() => {
    globalThis.fetch = realFetch;
  });

  const client = createWorkerClient({
    ...TEST_ENV,
    RESEND_API_KEY: "re_test_key_not_real",
    MAIL_FROM: "Juwon Electric <no-reply@juwon.test>",
    ADMIN_APP_URL: "https://admin.juwon.test",
  });
  const created = await client.request("POST", "/admin/users", {
    token: TEST_ENV.ADMIN_TOKEN,
    body: { name: "Ivy Invite", email: "ivy@juwon.test", role: "support" },
  });
  assert.equal(created.status, 201);
  assert.equal(sent.length, 1);
  const [email] = sent;
  assert.equal(email.subject, "Set up your Juwon Electric admin account");
  assert.deepEqual([email.to].flat(), ["ivy@juwon.test"]);
  assert.ok(email.html.includes('<a href="https://admin.juwon.test"'));
  assert.ok(email.text.includes("https://admin.juwon.test"));
  assert.match(email.text, /Setup token: [0-9a-f]{64}/);
});
