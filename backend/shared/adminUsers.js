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

  const removesSuperadmin =
    targetRole === "superadmin" &&
    target.isActive !== false &&
    ((nextRole && nextRole !== "superadmin") || nextActive === false);
  if (removesSuperadmin) {
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
