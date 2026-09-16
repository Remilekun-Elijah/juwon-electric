// Admin user management rules shared by Express and the Worker (API_CONTRACT_V3 §2).
// Pure ESM. Each runtime supplies its own store, validators and error type.
import { ROLES, canManageRole, isValidRole, normalizeRole } from "./capabilities.js";

export const USER_MESSAGES = {
  list: "Users retrieved.",
  get: "User retrieved.",
  create: "User created.",
  update: "User updated.",
  role: "Role updated.",
  deactivate: "User deactivated.",
  reactivate: "User reactivated.",
  notFound: "User not found.",
  emailTaken: "An account with this email already exists.",
  roleInvalid: "Role is not valid.",
  self: "You cannot change your own role or status.",
  lastSuperadmin: "At least one active superadmin is required.",
  isActiveInvalid: "isActive must be true or false.",
  qTooLong: "q must be 100 characters or fewer.",
  qText: "q must be text.",
};

export const Q_MAX = 100;

/** A role from a body or query value, or null when it is not a valid role. */
export const parseRole = (value) =>
  typeof value === "string" && isValidRole(value.trim()) ? value.trim() : null;

/**
 * Filters and sorts admin records for GET /admin/users.
 * `filters` = { role?, isActive?: boolean, q?: string }. Newest first.
 */
export const filterAdmins = (admins, { role, isActive, q } = {}) => {
  const needle = q ? q.toLowerCase() : "";
  return admins
    .filter((admin) => (role ? normalizeRole(admin.role) === role : true))
    .filter((admin) => (isActive === undefined ? true : (admin.isActive !== false) === isActive))
    .filter((admin) =>
      needle
        ? String(admin.name || "").toLowerCase().includes(needle) ||
          String(admin.email || "").toLowerCase().includes(needle)
        : true
    )
    .sort(
      (a, b) =>
        String(b.createdAt || "").localeCompare(String(a.createdAt || "")) ||
        String(b.id).localeCompare(String(a.id))
    );
};

/**
 * GET /admin/users filters from raw query values. A value is a string, or an array when the
 * parameter is repeated (Express parses arrays; the Worker passes getAll() when repeated), and
 * repeated parameters are rejected the same way in both runtimes.
 * Returns { filters } or { error }.
 */
export const parseUserFilters = ({ role, isActive, q }) => {
  const filters = {};
  if (role !== undefined && role !== "") {
    filters.role = parseRole(role);
    if (!filters.role) return { error: USER_MESSAGES.roleInvalid };
  }
  if (isActive !== undefined && isActive !== "") {
    if (isActive !== "true" && isActive !== "false") return { error: USER_MESSAGES.isActiveInvalid };
    filters.isActive = isActive === "true";
  }
  if (q !== undefined && q !== "") {
    if (typeof q !== "string") return { error: USER_MESSAGES.qText };
    if (q.length > Q_MAX) return { error: USER_MESSAGES.qTooLong };
    filters.q = q.trim();
  }
  return { filters };
};

/** True when at least one active superadmin remains (post-write recount, review L1). */
export const hasActiveSuperadmin = (admins) =>
  admins.some((admin) => admin.isActive !== false && normalizeRole(admin.role) === "superadmin");

/** True when changing `target` to nextRole / nextActive removes an active superadmin. */
export const removesActiveSuperadmin = (target, { nextRole, nextActive }) =>
  normalizeRole(target.role) === "superadmin" &&
  target.isActive !== false &&
  ((nextRole !== undefined && nextRole !== "superadmin") || nextActive === false);

export const paginate = (items, page, limit) => ({
  items: items.slice((page - 1) * limit, (page - 1) * limit + limit),
  page,
  limit,
  total: items.length,
});

/**
 * State checks for role changes and (de)activation, in contract order.
 * Returns null when allowed, otherwise { status, message }.
 * - 403 when the actor may not manage the current or target role,
 * - 409 when the actor targets their own account,
 * - 409 when the change would leave no active superadmin.
 */
export const checkUserChange = ({ actor, target, nextRole, nextActive, admins, forbiddenMessage }) => {
  const targetRole = normalizeRole(target.role);
  if (!canManageRole(actor, targetRole) || (nextRole && !canManageRole(actor, nextRole))) {
    return { status: 403, message: forbiddenMessage };
  }
  if (actor.id === target.id) return { status: 409, message: USER_MESSAGES.self };

  if (removesActiveSuperadmin(target, { nextRole, nextActive })) {
    const others = admins.filter(
      (admin) =>
        admin.id !== target.id && admin.isActive !== false && normalizeRole(admin.role) === "superadmin"
    );
    if (others.length === 0) return { status: 409, message: USER_MESSAGES.lastSuperadmin };
  }
  return null;
};

export const roleChangeSummary = (user, from, to) => `Changed role of ${user.email}: ${from || "none"} → ${to}`;

export { ROLES };
