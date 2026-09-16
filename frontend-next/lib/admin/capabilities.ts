/**
 * Admin roles and capabilities, mirroring API_CONTRACT_V3 §1 (`backend/shared/capabilities.js`).
 *
 * UI only: the portal hides navigation and actions with these, and the server enforces every one.
 * The session's `capabilities` array (login / `GET /admin/auth/me`) is authoritative. The role map
 * below is only a fallback for a backend that doesn't return `capabilities` yet.
 */

export const ROLES = ["superadmin", "admin", "inventory", "sales", "engineer", "hr", "support"] as const;
export type Role = (typeof ROLES)[number];

export const CAPABILITIES = [
  "dashboard:read",
  "audit:read",
  "users:read",
  "users:manage",
  "settings:read",
  "settings:write",
  "content:read",
  "content:write",
  "products:read",
  "products:write",
  "inventory:read",
  "inventory:adjust",
  "orders:read",
  "orders:update",
  "orders:delete",
  "leads:read",
  "leads:write",
  "jobs:read",
  "jobs:assign",
  "jobs:update-own",
  "staff:read",
  "staff:write",
  "vacancies:read",
  "vacancies:write",
  "notifications:read",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

export const roleLabels: Record<Role, string> = {
  superadmin: "Super admin",
  admin: "Admin",
  inventory: "Inventory",
  sales: "Sales",
  engineer: "Engineer",
  hr: "HR",
  support: "Support",
};

export const roleOptions = ROLES.map((value) => ({ value, label: roleLabels[value] }));

const S = "superadmin";
const A = "admin";
const I = "inventory";
const SA = "sales";
const E = "engineer";
const H = "hr";
const SU = "support";

/** Capability → roles (contract §1.2). superadmin has every capability. */
const CAPABILITY_ROLES: Record<Capability, readonly Role[]> = {
  "dashboard:read": [S, A, I, SA, H, SU],
  "audit:read": [S, A],
  "users:read": [S, A],
  "users:manage": [S, A],
  "settings:read": [S, A, I, SA, H, SU],
  "settings:write": [S, A],
  "content:read": [S, A, I, SA, SU],
  "content:write": [S, A, SA],
  "products:read": [S, A, I, SA, SU],
  "products:write": [S, A, I],
  "inventory:read": [S, A, I, SA],
  "inventory:adjust": [S, A, I],
  "orders:read": [S, A, I, SA, SU],
  "orders:update": [S, A, SA],
  "orders:delete": [S, A],
  "leads:read": [S, A, SA, SU],
  "leads:write": [S, A, SA, SU],
  "jobs:read": [S, A, SA, SU],
  "jobs:assign": [S, A, SA],
  "jobs:update-own": [S, E],
  "staff:read": [S, A, SA, H],
  "staff:write": [S, A, H],
  "vacancies:read": [S, A, H],
  "vacancies:write": [S, A, H],
  "notifications:read": [S, A, I, SA, E, H, SU],
};

/** Contract `normalizeRole`: legacy `super_admin` reads as `superadmin`. Unknown roles return null. */
export const normalizeRole = (role: unknown): Role | null => {
  const value = role === "super_admin" ? "superadmin" : role;
  return (ROLES as readonly unknown[]).includes(value) ? (value as Role) : null;
};

export const capabilitiesForRole = (role: unknown): Capability[] => {
  const normalized = normalizeRole(role);
  if (!normalized) return [];
  if (normalized === "superadmin") return [...CAPABILITIES];
  return CAPABILITIES.filter((capability) => CAPABILITY_ROLES[capability].includes(normalized));
};

export type AdminSelf = {
  id: string;
  name: string;
  email: string;
  role: Role | string;
  capabilities?: string[];
  isStatic?: true;
};

/** Capabilities for the signed-in admin: the server's list when present, otherwise derived from the role. */
export const capabilitiesFor = (admin: Partial<AdminSelf> | null | undefined): Set<string> => {
  if (!admin) return new Set();
  if (Array.isArray(admin.capabilities)) return new Set(admin.capabilities);
  return new Set(capabilitiesForRole(admin.role));
};
