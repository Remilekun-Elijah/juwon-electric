// Admin roles, capability gating and user management (API_CONTRACT_V3 §1-2).
// Runtime-agnostic: `request(method, path, { token, body })` -> { status, body }.
// Returns a transcript of every response for the Express <-> Worker parity test.
import assert from "node:assert/strict";

export const OWNER = { email: "owner@juwon.test", password: "Correct-Horse-Battery-9" };
export const STATIC_TOKEN = "static-admin-token-for-tests-0123456789abcdef";
export const PASSWORD = "Another-Strong-Passw0rd";

export const TEST_ENV = {
  ADMIN_AUTH_SECRET: "test-signing-secret-0123456789abcdefghijkl",
  SUPERADMIN_EMAIL: OWNER.email,
  SUPERADMIN_PASSWORD: OWNER.password,
  ADMIN_TOKEN: STATIC_TOKEN,
  DEV_EXPOSE_RESET_TOKEN: "true",
  TURNSTILE_DISABLED: "true",
};

const FORBIDDEN = "You do not have permission to perform this action.";

export const runAdminUsersScenario = async (request) => {
  const transcript = [];
  // `statusOnly` records only status and message (bodies that depend on seed data).
  const call = async (label, method, path, options = {}) => {
    const { statusOnly, ...rest } = options;
    const response = await request(method, path, rest);
    const body = statusOnly ? { message: response.body?.message } : response.body;
    transcript.push({ label, method, path, status: response.status, body });
    return response;
  };
  const expect = async (label, method, path, options, status, message) => {
    const response = await call(label, method, path, options);
    assert.equal(response.status, status, `${label}: ${JSON.stringify(response.body)}`);
    if (message) assert.equal(response.body.message, message, label);
    return response;
  };

  const login = async (label, username, password) =>
    (await expect(label, "POST", "/admin/auth/login", { body: { username, password } }, 200)).body.data;

  // Sets the password of an invited account through the existing reset flow.
  const acceptInvite = async (label, email) => {
    const requested = await expect(`${label}: request`, "POST", "/admin/auth/request-password-reset", {
      body: { username: email },
    }, 200);
    const token = requested.body.data.resetToken;
    assert.ok(token, `${label}: reset token exposed in test mode`);
    await expect(`${label}: reset`, "POST", "/admin/auth/reset-password", {
      body: { username: email, token, password: PASSWORD },
    }, 200);
    return login(`${label}: login`, email, PASSWORD);
  };

  // ---- identity -------------------------------------------------------------
  const owner = await login("owner login", OWNER.email, OWNER.password);
  assert.equal(owner.admin.role, "superadmin");
  assert.ok(owner.admin.capabilities.includes("users:manage"));
  assert.deepEqual(owner.admin.capabilities, [...owner.admin.capabilities].sort());
  assert.equal(owner.admin.isStatic, undefined);

  const me = await expect("owner me", "GET", "/admin/auth/me", { token: owner.token }, 200, "Session retrieved.");
  assert.equal(me.body.data.admin.email, OWNER.email);

  const staticMe = await expect("static me", "GET", "/admin/auth/me", { token: STATIC_TOKEN }, 200);
  assert.equal(staticMe.body.data.admin.role, "superadmin");
  assert.equal(staticMe.body.data.admin.isStatic, true);

  await expect("no token", "GET", "/admin/users", {}, 401, "Admin authorization is required.");

  // ---- create (invite) --------------------------------------------------------
  const sales = (
    await expect("create sales", "POST", "/admin/users", {
      token: owner.token,
      body: { name: "Sally Sales", email: "Sales@Juwon.test", role: "sales" },
    }, 201, "User created.")
  ).body.data;
  assert.equal(sales.email, "sales@juwon.test");
  assert.equal(sales.phone, null);
  assert.deepEqual(sales.profile, { areaCoverage: [], certifications: [], bio: null, avatarUrl: null });
  assert.equal(sales.passwordHash, undefined);

  await expect("invited cannot sign in", "POST", "/admin/auth/login", {
    body: { username: "sales@juwon.test", password: PASSWORD },
  }, 401);

  await expect("duplicate email", "POST", "/admin/users", {
    token: owner.token,
    body: { name: "Again", email: "SALES@juwon.test", role: "support" },
  }, 409, "An account with this email already exists.");
  await expect("invalid role", "POST", "/admin/users", {
    token: owner.token,
    body: { name: "Cust", email: "cust@juwon.test", role: "customer" },
  }, 400, "Role is not valid.");
  await expect("missing name", "POST", "/admin/users", {
    token: owner.token,
    body: { email: "noname@juwon.test", role: "sales" },
  }, 400, "Name is required.");

  const admin = (
    await expect("create admin", "POST", "/admin/users", {
      token: owner.token,
      body: { name: "Ada Admin", email: "admin@juwon.test", role: "admin", phone: "+234 801 234 5678" },
    }, 201)
  ).body.data;
  assert.equal(admin.phone, "+234 801 234 5678");

  // ---- list / get -------------------------------------------------------------
  const listed = await expect("list sales", "GET", "/admin/users?role=sales", { token: owner.token }, 200, "Users retrieved.");
  assert.deepEqual(
    { page: listed.body.data.page, limit: listed.body.data.limit, total: listed.body.data.total },
    { page: 1, limit: 50, total: 1 }
  );
  assert.equal(listed.body.data.items[0].id, sales.id);
  const searched = await expect("search", "GET", "/admin/users?q=ADA&isActive=true", { token: owner.token }, 200);
  assert.deepEqual(searched.body.data.items.map((item) => item.id), [admin.id]);
  await expect("bad role filter", "GET", "/admin/users?role=root", { token: owner.token }, 400, "Role is not valid.");
  await expect("bad isActive", "GET", "/admin/users?isActive=yes", { token: owner.token }, 400);
  await expect("bad page", "GET", "/admin/users?page=0", { token: owner.token }, 400, "page must be a whole number from 1 to 100000.");
  // Repeated parameters are rejected the same way in both runtimes (review L2).
  await expect("repeated role", "GET", "/admin/users?role=sales&role=admin", { token: owner.token }, 400, "Role is not valid.");
  await expect("repeated isActive", "GET", "/admin/users?isActive=true&isActive=false", { token: owner.token }, 400, "isActive must be true or false.");
  await expect("repeated q", "GET", "/admin/users?q=a&q=b", { token: owner.token }, 400, "q must be text.");
  await expect("repeated page", "GET", "/admin/users?page=1&page=2", { token: owner.token }, 400, "page must be a whole number from 1 to 100000.");
  await expect("repeated limit", "GET", "/admin/users?limit=1&limit=2", { token: owner.token }, 400, "limit must be a positive whole number.");
  await expect("get user", "GET", `/admin/users/${sales.id}`, { token: owner.token }, 200, "User retrieved.");
  await expect("unknown user", "GET", "/admin/users/nope", { token: owner.token }, 404, "User not found.");

  // ---- gating per role ----------------------------------------------------------
  const salesSession = await acceptInvite("sales invite", "sales@juwon.test");
  assert.equal(salesSession.admin.role, "sales");
  assert.ok(!salesSession.admin.capabilities.includes("orders:delete"));

  await expect("sales orders", "GET", "/admin/orders", { token: salesSession.token, statusOnly: true }, 200);
  await expect("sales carts", "GET", "/admin/carts", { token: salesSession.token, statusOnly: true }, 200);
  await expect("sales packages", "GET", "/admin/packages", { token: salesSession.token, statusOnly: true }, 200);
  await expect("sales users", "GET", "/admin/users", { token: salesSession.token }, 403, FORBIDDEN);
  await expect("sales audit", "GET", "/admin/audit-logs", { token: salesSession.token }, 403, FORBIDDEN);
  await expect("sales order delete", "DELETE", "/admin/orders/nope", { token: salesSession.token }, 403, FORBIDDEN);
  await expect("sales order update", "PUT", "/admin/orders/nope", { token: salesSession.token, body: {} }, 404, "Order not found.");
  // Prototype keys are ordinary invalid input (review L3).
  for (const type of ["__proto__", "constructor", "toString"]) {
    await expect(`reads type ${type}`, "POST", "/admin/reads", {
      token: salesSession.token,
      body: { type, id: "nope" },
    }, 400, "Type must be contacts or orders.");
  }
  await expect("sales read orders", "POST", "/admin/reads", {
    token: salesSession.token,
    body: { type: "orders", id: "nope" },
  }, 404, "Order not found.");

  // ---- escalation ---------------------------------------------------------------
  const adminSession = await acceptInvite("admin invite", "admin@juwon.test");
  await expect("admin users", "GET", "/admin/users", { token: adminSession.token }, 200);
  await expect("admin grants admin", "POST", `/admin/users/${sales.id}/role`, {
    token: adminSession.token,
    body: { role: "admin" },
  }, 403, FORBIDDEN);
  await expect("admin creates admin", "POST", "/admin/users", {
    token: adminSession.token,
    body: { name: "Other", email: "other@juwon.test", role: "admin" },
  }, 403, FORBIDDEN);
  await expect("admin edits superadmin", "PUT", `/admin/users/${owner.admin.id}`, {
    token: adminSession.token,
    body: { name: "Renamed" },
  }, 403, FORBIDDEN);
  await expect("admin deactivates superadmin", "POST", `/admin/users/${owner.admin.id}/deactivate`, {
    token: adminSession.token,
  }, 403, FORBIDDEN);
  await expect("invalid role change", "POST", `/admin/users/${sales.id}/role`, {
    token: adminSession.token,
    body: { role: "root" },
  }, 400, "Role is not valid.");

  // A role change applies on the account's next request.
  const toSupport = await expect("sales -> support", "POST", `/admin/users/${sales.id}/role`, {
    token: adminSession.token,
    body: { role: "support" },
  }, 200, "Role updated.");
  assert.equal(toSupport.body.data.role, "support");
  await expect("support order update", "PUT", "/admin/orders/nope", { token: salesSession.token, body: {} }, 403, FORBIDDEN);
  const supportMe = await expect("support me", "GET", "/admin/auth/me", { token: salesSession.token }, 200);
  assert.equal(supportMe.body.data.admin.role, "support");

  const toEngineer = await expect("support -> engineer", "POST", `/admin/users/${sales.id}/role`, {
    token: owner.token,
    body: { role: "engineer" },
  }, 200);
  assert.equal(toEngineer.body.data.role, "engineer");
  await expect("engineer read contacts", "POST", "/admin/reads", {
    token: salesSession.token,
    body: { type: "contacts", id: "nope" },
  }, 403, FORBIDDEN);
  await expect("engineer dashboard", "GET", "/admin/dashboard", { token: salesSession.token }, 403, FORBIDDEN);

  // Self changes and the last superadmin.
  await expect("self role", "POST", `/admin/users/${owner.admin.id}/role`, {
    token: owner.token,
    body: { role: "admin" },
  }, 409, "You cannot change your own role or status.");
  await expect("self deactivate", "POST", `/admin/users/${owner.admin.id}/deactivate`, {
    token: owner.token,
  }, 409, "You cannot change your own role or status.");
  await expect("last superadmin demote", "POST", `/admin/users/${owner.admin.id}/role`, {
    token: STATIC_TOKEN,
    body: { role: "admin" },
  }, 409, "At least one active superadmin is required.");
  await expect("last superadmin deactivate", "POST", `/admin/users/${owner.admin.id}/deactivate`, {
    token: STATIC_TOKEN,
  }, 409, "At least one active superadmin is required.");

  // ---- update -----------------------------------------------------------------------
  const renamed = await expect("update user", "PUT", `/admin/users/${sales.id}`, {
    token: owner.token,
    body: { name: "Sam Engineer", phone: "08012345678", role: "superadmin", isActive: false },
  }, 200, "User updated.");
  assert.equal(renamed.body.data.name, "Sam Engineer");
  assert.equal(renamed.body.data.phone, "08012345678");
  assert.equal(renamed.body.data.role, "engineer", "role is not writable through PUT");
  assert.equal(renamed.body.data.isActive, true, "isActive is not writable through PUT");
  const cleared = await expect("clear phone", "PUT", `/admin/users/${sales.id}`, {
    token: owner.token,
    body: { phone: null },
  }, 200);
  assert.equal(cleared.body.data.phone, null);
  await expect("bad phone", "PUT", `/admin/users/${sales.id}`, {
    token: owner.token,
    body: { phone: "abc" },
  }, 400, "Enter a valid phone number.");

  // ---- deactivate / reactivate ----------------------------------------------------------
  const off = await expect("deactivate", "POST", `/admin/users/${sales.id}/deactivate`, { token: adminSession.token }, 200, "User deactivated.");
  assert.equal(off.body.data.isActive, false);
  await expect("deactivated token", "GET", "/admin/auth/me", { token: salesSession.token }, 401);
  await expect("deactivated login", "POST", "/admin/auth/login", {
    body: { username: "sales@juwon.test", password: PASSWORD },
  }, 401);
  await expect("deactivate again", "POST", `/admin/users/${sales.id}/deactivate`, { token: adminSession.token }, 200, "User deactivated.");
  const inactive = await expect("list inactive", "GET", "/admin/users?isActive=false", { token: owner.token }, 200);
  assert.deepEqual(inactive.body.data.items.map((item) => item.id), [sales.id]);
  await expect("reactivate", "POST", `/admin/users/${sales.id}/reactivate`, { token: adminSession.token }, 200, "User reactivated.");
  await expect("reactivate again", "POST", `/admin/users/${sales.id}/reactivate`, { token: adminSession.token }, 200, "User reactivated.");
  await login("login after reactivate", "sales@juwon.test", PASSWORD);

  // ---- audit ----------------------------------------------------------------------------
  const logs = await expect("audit users", "GET", "/admin/audit-logs?entity=user&limit=100", { token: owner.token, statusOnly: true }, 200);
  const actions = [...new Set(logs.body.data.items.map((item) => item.action))].sort();
  assert.deepEqual(actions, ["user.create", "user.deactivate", "user.reactivate", "user.role_change", "user.update"]);
  for (const item of logs.body.data.items) {
    assert.ok(!item.changes.some((name) => /password|token|hash/i.test(name)), "no sensitive audit fields");
  }
  transcript.push({ label: "audit actions", status: 200, body: actions });

  return transcript;
};

/**
 * Two superadmins demote each other concurrently (review L1). Whatever the interleaving,
 * at least one active superadmin must remain, and every rejected request is the 409.
 */
export const runLastSuperadminRace = async (request) => {
  const owner = (await request("POST", "/admin/auth/login", { body: { username: OWNER.email, password: OWNER.password } })).body.data;
  const second = (
    await request("POST", "/admin/users", {
      token: STATIC_TOKEN,
      body: { name: "Second Super", email: "second@juwon.test", role: "superadmin" },
    })
  ).body.data;
  // Owner and second must be the only active superadmins.
  const supers = await request("GET", "/admin/users?role=superadmin&isActive=true&limit=100", { token: STATIC_TOKEN });
  for (const other of supers.body.data.items.filter((item) => ![owner.admin.id, second.id].includes(item.id))) {
    await request("POST", `/admin/users/${other.id}/role`, { token: STATIC_TOKEN, body: { role: "admin" } });
  }
  let conflicts = 0;

  for (let round = 0; round < 10; round += 1) {
    const results = await Promise.all([
      request("POST", `/admin/users/${second.id}/role`, { token: STATIC_TOKEN, body: { role: "admin" } }),
      request("POST", `/admin/users/${owner.admin.id}/deactivate`, { token: STATIC_TOKEN }),
    ]);
    for (const result of results) {
      if (result.status === 200) continue;
      conflicts += 1;
      assert.equal(result.status, 409, JSON.stringify(result.body));
      assert.equal(result.body.message, "At least one active superadmin is required.");
    }
    const list = await request("GET", "/admin/users?role=superadmin&isActive=true", { token: STATIC_TOKEN });
    assert.ok(list.body.data.total >= 1, `round ${round}: no active superadmin left`);

    await request("POST", `/admin/users/${owner.admin.id}/reactivate`, { token: STATIC_TOKEN });
    await request("POST", `/admin/users/${second.id}/role`, { token: STATIC_TOKEN, body: { role: "superadmin" } });
  }
  // At least one request of each pair must lose (both succeeding leaves no superadmin);
  // under a true interleaving both may be rolled back.
  assert.ok(conflicts >= 10, `conflicts: ${conflicts}`);
};
