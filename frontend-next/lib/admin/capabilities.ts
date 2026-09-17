/**
 * Admin roles and capabilities, mirroring API_CONTRACT_V3 §1 (`backend/shared/capabilities.js`).
 *
 * UI only: the portal hides navigation and actions with these, and the server enforces every one.
 * Gating always uses the session's `capabilities` array (login / `GET /admin/auth/me`), never the role.
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

/** Contract `normalizeRole`: legacy `super_admin` reads as `superadmin`. Unknown roles return null. Display only. */
export const normalizeRole = (role: unknown): Role | null => {
  const value = role === "super_admin" ? "superadmin" : role;
  return (ROLES as readonly unknown[]).includes(value) ? (value as Role) : null;
};

export type AdminSelf = {
  id: string;
  name: string;
  email: string;
  role: Role | string;
  capabilities?: string[];
  isStatic?: true;
};

/**
 * Capabilities for the signed-in admin, straight from the session (`capabilities[]`). Never derived from the role
 * (FE_CONVENTIONS §3.5): an admin without capabilities sees an empty shell.
 */
export const capabilitiesFor = (admin: Partial<AdminSelf> | null | undefined): Set<string> =>
  new Set(Array.isArray(admin?.capabilities) ? admin.capabilities : []);

export const can = (admin: Partial<AdminSelf> | null | undefined, capability: Capability) =>
  Array.isArray(admin?.capabilities) && admin.capabilities.includes(capability);
