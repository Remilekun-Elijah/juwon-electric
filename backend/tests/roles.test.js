import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  CAPABILITIES,
  ROLES,
  ROLE_CAPABILITIES,
  adminView,
  canManageRole,
  capabilitiesFor,
  hasCapabilities,
  normalizeRole,
} from "../services/roles.js";

test("Express and Worker role maps are identical", async () => {
  const express = await readFile(new URL("../services/roles.js", import.meta.url), "utf8");
  const worker = await readFile(new URL("../cloudflare/src/roles.js", import.meta.url), "utf8");
  assert.equal(worker, express, "copy backend/services/roles.js to backend/cloudflare/src/roles.js");
});

test("every role maps only to known capabilities", () => {
  assert.deepEqual(Object.keys(ROLE_CAPABILITIES).sort(), [...ROLES].sort());
  for (const [role, capabilities] of Object.entries(ROLE_CAPABILITIES)) {
    for (const capability of capabilities) {
      assert.ok(CAPABILITIES.includes(capability), `${role}: unknown capability ${capability}`);
    }
  }
});

test("legacy super_admin normalizes to superadmin", () => {
  assert.equal(normalizeRole("super_admin"), "superadmin");
  assert.equal(normalizeRole(" SuperAdmin "), "superadmin");
  assert.equal(normalizeRole("root"), null);
  assert.equal(normalizeRole(undefined), null);
});

test("unknown roles fail closed", () => {
  assert.deepEqual(capabilitiesFor("root"), []);
  assert.equal(hasCapabilities("root", "orders:read"), false);
  assert.equal(hasCapabilities(undefined), false);
});

test("capability checks per role", () => {
  assert.equal(hasCapabilities("super_admin", "users:write", "jobs:own"), true);
  assert.equal(hasCapabilities("admin", "users:write", "vacancies:write"), true);
  assert.equal(hasCapabilities("sales", "orders:write"), true);
  assert.equal(hasCapabilities("sales", "catalog:write"), false);
  assert.equal(hasCapabilities("inventory", "catalog:write", "inventory:write"), true);
  assert.equal(hasCapabilities("inventory", "orders:write"), false);
  assert.equal(hasCapabilities("engineer", "jobs:own"), true);
  assert.equal(hasCapabilities("engineer", "orders:read"), false);
  assert.equal(hasCapabilities("hr", "vacancies:write"), true);
  assert.equal(hasCapabilities("hr", "users:read"), false);
  assert.equal(hasCapabilities("support", "contacts:write"), true);
  assert.equal(hasCapabilities("support", "orders:write"), false);
});

test("only a superadmin manages privileged roles", () => {
  assert.equal(canManageRole("superadmin", "admin"), true);
  assert.equal(canManageRole("super_admin", "superadmin"), true);
  assert.equal(canManageRole("admin", "sales"), true);
  assert.equal(canManageRole("admin", "admin"), false);
  assert.equal(canManageRole("admin", "super_admin"), false);
  assert.equal(canManageRole("sales", "support"), false);
});

test("adminView never exposes the password hash", () => {
  const view = adminView({ id: "a", email: "a@b.co", role: "super_admin", passwordHash: "x" });
  assert.equal(view.passwordHash, undefined);
  assert.equal(view.role, "superadmin");
  assert.equal(view.isActive, true);
});
