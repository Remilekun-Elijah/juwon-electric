// Admin roles and the server-side capability map (AGENT_WORKLOAD_SPLIT D4).
//
// This file is dependency-free on purpose: an identical copy lives at
// backend/cloudflare/src/roles.js, and a test asserts both stay in sync.
//
// Capabilities are "<area>:<action>". A route lists the capabilities it
// requires; a role is allowed when it holds all of them. The superadmin holds
// every capability.

export const ROLES = ["superadmin", "admin", "inventory", "sales", "engineer", "hr", "support"];

// Only a superadmin may grant these roles or change accounts that hold them.
export const PRIVILEGED_ROLES = ["superadmin", "admin"];

export const CAPABILITIES = [
  "dashboard:read",
  "audit:read",
  "users:read",
  "users:write",
  "catalog:read",
  "catalog:write",
  "inventory:read",
  "inventory:write",
  "orders:read",
  "orders:write",
  "jobs:read",
  "jobs:write",
  "jobs:own",
  "contacts:read",
  "contacts:write",
  "newsletter:read",
  "newsletter:write",
  "carts:read",
  "vacancies:read",
  "vacancies:write",
  "settings:read",
  "settings:write",
  "notifications:read",
];

export const ROLE_CAPABILITIES = {
  superadmin: [...CAPABILITIES],
  admin: CAPABILITIES.filter((capability) => capability !== "jobs:own"),
  inventory: [
    "dashboard:read",
    "catalog:read",
    "catalog:write",
    "inventory:read",
    "inventory:write",
    "orders:read",
    "notifications:read",
  ],
  sales: [
    "dashboard:read",
    "catalog:read",
    "inventory:read",
    "orders:read",
    "orders:write",
    "jobs:read",
    "jobs:write",
    "contacts:read",
    "contacts:write",
    "newsletter:read",
    "carts:read",
    "notifications:read",
  ],
  engineer: ["jobs:own", "notifications:read"],
  hr: ["vacancies:read", "vacancies:write", "notifications:read"],
  support: ["orders:read", "contacts:read", "contacts:write", "newsletter:read", "notifications:read"],
};

// The seeded account was historically stored as "super_admin".
const LEGACY_ROLES = { super_admin: "superadmin", "super-admin": "superadmin" };

/** Stored role -> canonical role, or null when unknown. */
export const normalizeRole = (role) => {
  const value = String(role ?? "").trim().toLowerCase();
  const canonical = LEGACY_ROLES[value] || value;
  return ROLES.includes(canonical) ? canonical : null;
};

/** Capabilities of a (possibly legacy) role; [] for unknown roles (fail closed). */
export const capabilitiesFor = (role) => {
  const canonical = normalizeRole(role);
  return canonical ? [...ROLE_CAPABILITIES[canonical]] : [];
};

/** True when the role holds every listed capability. */
export const hasCapabilities = (role, ...capabilities) => {
  const canonical = normalizeRole(role);
  if (!canonical) return false;
  if (canonical === "superadmin") return true;
  const held = ROLE_CAPABILITIES[canonical];
  return capabilities.flat().every((capability) => held.includes(capability));
};

/** Whether `actorRole` may grant `targetRole`, or manage an account that holds it. */
export const canManageRole = (actorRole, targetRole) => {
  const actor = normalizeRole(actorRole);
  if (actor === "superadmin") return true;
  if (!hasCapabilities(actor, "users:write")) return false;
  return !PRIVILEGED_ROLES.includes(normalizeRole(targetRole));
};

/**
 * The admin account as returned by the API: never the password hash. `role`
 * is canonical (legacy "super_admin" reads as "superadmin").
 */
export const adminView = (admin) => ({
  id: admin.id,
  name: admin.name ?? null,
  email: admin.email ?? null,
  role: normalizeRole(admin.role),
  capabilities: capabilitiesFor(admin.role),
  isActive: admin.isActive !== false,
  lastLoginAt: admin.lastLoginAt ?? null,
  createdAt: admin.createdAt ?? null,
  updatedAt: admin.updatedAt ?? null,
});

/** The shorter shape returned by login and /admin/auth/me. */
export const sessionAdminView = (admin) => ({
  id: admin.id,
  name: admin.name ?? null,
  email: admin.email ?? null,
  role: normalizeRole(admin.role),
  capabilities: capabilitiesFor(admin.role),
});

export const FORBIDDEN_MESSAGE = "You do not have permission to perform this action.";
export const PRIVILEGED_ROLE_MESSAGE = "Only a super admin can manage admin and super admin accounts.";
export const LAST_SUPERADMIN_MESSAGE = "At least one active super admin is required.";
