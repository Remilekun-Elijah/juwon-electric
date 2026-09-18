// Admin roles and capabilities (API_CONTRACT_V3 §1). The single source of
// truth for Express and the Worker: pure ESM, no Node or Worker globals.

export const ROLES = ["superadmin", "admin", "inventory", "sales", "engineer", "hr", "support"];

// Roles only a superadmin may grant, or manage accounts that hold them (§1.5).
export const PRIVILEGED_ROLES = ["superadmin", "admin"];

// capability -> roles holding it. superadmin is a wildcard (hasCapability), so
// it is not listed here and automatically holds capabilities added later.
export const CAPABILITIES = {
  "dashboard:read": ["admin", "inventory", "sales", "hr", "support"],
  "audit:read": ["admin"],
  "users:read": ["admin"],
  "users:manage": ["admin"],
  "settings:read": ["admin", "inventory", "sales", "hr", "support"],
  "settings:write": ["admin"],
  "content:read": ["admin", "inventory", "sales", "support"],
  "content:write": ["admin", "sales"],
  "products:read": ["admin", "inventory", "sales", "support"],
  "products:write": ["admin", "inventory"],
  "inventory:read": ["admin", "inventory", "sales"],
  "inventory:adjust": ["admin", "inventory"],
  "orders:read": ["admin", "inventory", "sales", "support"],
  "orders:create": ["admin", "sales"],
  "orders:update": ["admin", "sales"],
  "orders:delete": ["admin"],
  "leads:read": ["admin", "sales", "support"],
  "leads:write": ["admin", "sales", "support"],
  "jobs:read": ["admin", "sales", "support"],
  "jobs:assign": ["admin", "sales"],
  "jobs:update-own": ["engineer"],
  "staff:read": ["admin", "sales", "hr"],
  "staff:write": ["admin", "hr"],
  "vacancies:read": ["admin", "hr"],
  "vacancies:write": ["admin", "hr"],
  "notifications:read": ["admin", "inventory", "sales", "engineer", "hr", "support"],
};

export const FORBIDDEN_MESSAGE = "You do not have permission to perform this action.";

/** Stored role -> canonical role. Legacy "super_admin" reads as "superadmin". */
export const normalizeRole = (role) => (role === "super_admin" ? "superadmin" : role);

export const isValidRole = (role) => ROLES.includes(role);

const roleOf = (roleOrAdmin) =>
  normalizeRole(
    roleOrAdmin && typeof roleOrAdmin === "object" ? roleOrAdmin.role : roleOrAdmin
  );

/** Sorted capabilities of a role; the full list for superadmin, [] for unknown roles. */
export const capabilitiesFor = (roleOrAdmin) => {
  const role = roleOf(roleOrAdmin);
  if (role === "superadmin") return Object.keys(CAPABILITIES).sort();
  if (!isValidRole(role)) return [];
  return Object.keys(CAPABILITIES)
    .filter((capability) => CAPABILITIES[capability].includes(role))
    .sort();
};

/** True when the role (or an admin record's stored role) holds the capability. Fails closed. */
export const hasCapability = (roleOrAdmin, capability) => {
  const role = roleOf(roleOrAdmin);
  if (role === "superadmin") return true;
  if (!isValidRole(role)) return false;
  return Object.hasOwn(CAPABILITIES, capability) && CAPABILITIES[capability].includes(role);
};

/** True when the actor may create or modify an account whose current or target role is `role`. */
export const canManageRole = (actorRoleOrAdmin, role) =>
  roleOf(actorRoleOrAdmin) === "superadmin" || !PRIVILEGED_ROLES.includes(normalizeRole(role));

// ---- admin shapes (§1.5, §2) ------------------------------------------------

export const emptyStaffProfile = () => ({
  areaCoverage: [],
  certifications: [],
  bio: null,
  avatarUrl: null,
});

const staffProfile = (profile) => {
  const stored = profile && typeof profile === "object" && !Array.isArray(profile) ? profile : {};
  const defaults = emptyStaffProfile();
  return {
    areaCoverage: Array.isArray(stored.areaCoverage) ? stored.areaCoverage : defaults.areaCoverage,
    certifications: Array.isArray(stored.certifications) ? stored.certifications : defaults.certifications,
    bio: typeof stored.bio === "string" ? stored.bio : defaults.bio,
    avatarUrl: typeof stored.avatarUrl === "string" ? stored.avatarUrl : defaults.avatarUrl,
  };
};

/** AdminSelf: login and GET /admin/auth/me. */
export const adminSelf = (admin, { isStatic = false } = {}) => ({
  id: admin.id,
  name: admin.name ?? "",
  email: admin.email ?? "",
  role: normalizeRole(admin.role) ?? null,
  // Their own photo, so the admin header shows it (2026-09-18).
  avatarUrl: staffProfile(admin.profile).avatarUrl,
  capabilities: capabilitiesFor(admin),
  ...(isStatic ? { isStatic: true } : {}),
});

/** AdminUser: /admin/users (and /admin/staff). Never the password hash, tokens or sessions. */
export const adminUser = (admin) => ({
  id: admin.id,
  name: admin.name ?? "",
  email: admin.email ?? "",
  role: normalizeRole(admin.role) ?? null,
  isActive: admin.isActive !== false,
  phone: typeof admin.phone === "string" && admin.phone ? admin.phone : null,
  profile: staffProfile(admin.profile),
  lastLoginAt: admin.lastLoginAt ?? null,
  createdAt: admin.createdAt ?? null,
  updatedAt: admin.updatedAt ?? null,
});

// The identity the static ADMIN_TOKEN acts as.
export const STATIC_ADMIN = Object.freeze({
  id: "static-token",
  name: "Static admin token",
  email: "static-token",
  role: "superadmin",
});
