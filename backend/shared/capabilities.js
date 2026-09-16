// Role -> capability map (decision D4), used by the temporary requireCapability shims in
// both runtimes until BE-1's implementation lands. Keep the capability names in sync with
// docs/agents/API_CONTRACT_V3.md once SUP-BE publishes it; the contract wins.
//
// Admin accounts seeded today carry role "super_admin" and the static ADMIN_TOKEN acts as
// "super_admin"; both map to superadmin. An account without a known role has no
// capabilities (fail closed).

export const CAPABILITIES = [
  "dashboard:read",
  "catalog:read",
  "catalog:write",
  "inventory:read",
  "inventory:write",
  "orders:read",
  "orders:write",
  "orders:delete",
  "jobs:read",
  "jobs:write",
  "jobs:own",
  "staff:read",
  "staff:write",
  "settings:read",
  "settings:write",
  "notifications:read",
];

const ALL = new Set(CAPABILITIES);

const ROLE_CAPABILITIES = {
  superadmin: ALL,
  admin: ALL,
  inventory: new Set([
    "dashboard:read",
    "catalog:read",
    "catalog:write",
    "inventory:read",
    "inventory:write",
    "orders:read",
    "notifications:read",
  ]),
  sales: new Set([
    "dashboard:read",
    "catalog:read",
    "inventory:read",
    "orders:read",
    "orders:write",
    "jobs:read",
    "jobs:write",
    "staff:read",
    "notifications:read",
  ]),
  engineer: new Set(["jobs:own"]),
  hr: new Set(["dashboard:read", "staff:read", "staff:write", "notifications:read"]),
  support: new Set(["catalog:read", "orders:read", "jobs:read", "notifications:read"]),
};

export const normalizeRole = (role) => {
  const value = String(role || "").trim().toLowerCase();
  return value === "super_admin" ? "superadmin" : value;
};

export const capabilitiesForRole = (role) => ROLE_CAPABILITIES[normalizeRole(role)] || new Set();

export const hasCapabilities = (role, capabilities) => {
  const granted = capabilitiesForRole(role);
  return capabilities.every((capability) => granted.has(capability));
};
