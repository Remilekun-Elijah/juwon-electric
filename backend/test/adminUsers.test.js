import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { startExpress } from "./helpers/express.js";
import { OWNER, PASSWORD, TEST_ENV, runAdminUsersScenario, runLastSuperadminRace } from "./scenarios/adminUsers.js";

let server;

before(async () => {
  server = await startExpress(TEST_ENV);
});

after(async () => {
  await server?.close();
});

test("Express: roles, capability gating and admin users", async () => {
  await runAdminUsersScenario(server.request);
});

test("Express: legacy super_admin reads as superadmin and is rewritten on the next write", async () => {
  const { createCollectionItem, findCollectionItem } = await import("../services/store.js");
  const { hashPassword } = await import("../services/adminAuthService.js");
  await createCollectionItem("admins", {
    name: "Legacy",
    email: "legacy@juwon.test",
    role: "super_admin",
    passwordHash: await hashPassword(PASSWORD),
    isActive: true,
  });

  const login = await server.request("POST", "/admin/auth/login", {
    body: { username: "legacy@juwon.test", password: PASSWORD },
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.data.admin.role, "superadmin");
  assert.equal((await findCollectionItem("admins", { email: "legacy@juwon.test" })).role, "superadmin");

  const list = await server.request("GET", "/admin/users?role=superadmin", { token: login.body.data.token });
  assert.deepEqual(list.body.data.items.map((item) => item.email).sort(), ["legacy@juwon.test", OWNER.email]);
});

test("Express: unknown role signs in but holds no capabilities", async () => {
  const { createCollectionItem } = await import("../services/store.js");
  const { hashPassword } = await import("../services/adminAuthService.js");
  await createCollectionItem("admins", {
    name: "Nobody",
    email: "nobody@juwon.test",
    role: "customer",
    passwordHash: await hashPassword(PASSWORD),
    isActive: true,
  });
  const login = await server.request("POST", "/admin/auth/login", {
    body: { username: "nobody@juwon.test", password: PASSWORD },
  });
  assert.equal(login.status, 200);
  assert.deepEqual(login.body.data.admin.capabilities, []);
  assert.equal((await server.request("GET", "/admin/auth/me", { token: login.body.data.token })).status, 200);
  assert.equal((await server.request("GET", "/admin/orders", { token: login.body.data.token })).status, 403);
});

test("Express: concurrent superadmin demotions never leave no active superadmin", async () => {
  await runLastSuperadminRace(server.request);
});
