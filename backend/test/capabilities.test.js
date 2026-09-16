import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CAPABILITIES,
  ROLES,
  adminSelf,
  adminUser,
  canManageRole,
  capabilitiesFor,
  hasCapability,
  normalizeRole,
} from "../shared/capabilities.js";

// API_CONTRACT_V3 §1.2, row by row (superadmin is the wildcard and not listed).
const CONTRACT = {
  "dashboard:read": "admin inventory sales hr support",
  "audit:read": "admin",
  "users:read": "admin",
  "users:manage": "admin",
  "settings:read": "admin inventory sales hr support",
  "settings:write": "admin",
  "content:read": "admin inventory sales support",
  "content:write": "admin sales",
  "products:read": "admin inventory sales support",
  "products:write": "admin inventory",
  "inventory:read": "admin inventory sales",
  "inventory:adjust": "admin inventory",
  "orders:read": "admin inventory sales support",
  "orders:update": "admin sales",
  "orders:delete": "admin",
  "leads:read": "admin sales support",
  "leads:write": "admin sales support",
  "jobs:read": "admin sales support",
  "jobs:assign": "admin sales",
  "jobs:update-own": "engineer",
  "staff:read": "admin sales hr",
  "staff:write": "admin hr",
  "vacancies:read": "admin hr",
  "vacancies:write": "admin hr",
  "notifications:read": "admin inventory sales engineer hr support",
};

test("capability table matches the contract exactly", () => {
  assert.deepEqual(ROLES, ["superadmin", "admin", "inventory", "sales", "engineer", "hr", "support"]);
  assert.deepEqual(Object.keys(CAPABILITIES).sort(), Object.keys(CONTRACT).sort());
  for (const [capability, roles] of Object.entries(CONTRACT)) {
    for (const role of ROLES) {
      const expected = role === "superadmin" || roles.split(" ").includes(role);
      assert.equal(hasCapability(role, capability), expected, `${role} ${capability}`);
    }
  }
});

test("superadmin is a wildcard, including capabilities added later", () => {
  assert.equal(hasCapability("superadmin", "anything:new"), true);
  assert.deepEqual(capabilitiesFor("superadmin"), Object.keys(CAPABILITIES).sort());
});

test("legacy super_admin normalizes; unknown or missing roles fail closed", () => {
  assert.equal(normalizeRole("super_admin"), "superadmin");
  assert.equal(hasCapability({ role: "super_admin" }, "users:manage"), true);
  for (const role of ["customer", "root", "", null, undefined, "SuperAdmin"]) {
    assert.deepEqual(capabilitiesFor(role), [], String(role));
    assert.equal(hasCapability(role, "notifications:read"), false, String(role));
  }
  assert.equal(hasCapability("admin", "unknown:cap"), false);
});

test("capabilitiesFor is sorted", () => {
  for (const role of ROLES) {
    const list = capabilitiesFor(role);
    assert.deepEqual(list, [...list].sort(), role);
  }
});

test("only a superadmin manages admin and superadmin roles", () => {
  assert.equal(canManageRole("superadmin", "admin"), true);
  assert.equal(canManageRole({ role: "super_admin" }, "superadmin"), true);
  assert.equal(canManageRole("admin", "sales"), true);
  assert.equal(canManageRole("admin", "admin"), false);
  assert.equal(canManageRole("admin", "super_admin"), false);
});

test("admin shapes never expose secrets and fill defaults", () => {
  const record = {
    id: "a1",
    name: "A",
    email: "a@juwon.test",
    role: "super_admin",
    passwordHash: "secret",
    profile: { areaCoverage: ["Lagos"], bio: 5 },
  };
  const user = adminUser(record);
  assert.deepEqual(Object.keys(user).sort(), [
    "createdAt", "email", "id", "isActive", "lastLoginAt", "name", "phone", "profile", "role", "updatedAt",
  ]);
  assert.deepEqual(user.profile, { areaCoverage: ["Lagos"], certifications: [], bio: null, avatarUrl: null });
  assert.equal(user.role, "superadmin");
  assert.equal(user.phone, null);

  const self = adminSelf(record);
  assert.deepEqual(Object.keys(self).sort(), ["capabilities", "email", "id", "name", "role"]);
  assert.equal(adminSelf(record, { isStatic: true }).isStatic, true);
});
