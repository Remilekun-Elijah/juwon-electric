// Admin user management (AGENT_WORKLOAD_SPLIT D4). Kept at parity with the
// Worker (backend/cloudflare/src/index.js, handleAdminUsers).
import { actorRole } from "../middleware/capability.js";
import { hashPassword, normalizeEmail, revokeAdminSessions } from "../services/adminAuthService.js";
import { asyncHandler } from "../services/asyncHandler.js";
import { audit } from "../services/audit.js";
import { ApiError, badRequest } from "../services/errors.js";
import { created, ok } from "../services/http.js";
import {
  LAST_SUPERADMIN_MESSAGE,
  PRIVILEGED_ROLE_MESSAGE,
  ROLES,
  adminView,
  canManageRole,
  normalizeRole,
} from "../services/roles.js";
import {
  createCollectionItem,
  findCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from "../services/store.js";
import {
  LIMITS,
  conflict,
  requiredString,
  validateEmail,
  validatePassword,
} from "../services/validators.js";

const EMAIL_TAKEN_MESSAGE = "An admin with this email already exists.";

const roleField = (body) => {
  const raw = body?.role;
  if (typeof raw !== "string" || !raw.trim()) throw badRequest("Role is required.");
  const role = raw.trim().toLowerCase();
  if (!ROLES.includes(role)) throw badRequest(`Role must be one of: ${ROLES.join(", ")}.`);
  return role;
};

const assertCanManage = (req, role) => {
  if (!canManageRole(actorRole(req), role)) throw new ApiError(403, PRIVILEGED_ROLE_MESSAGE);
};

const assertNotSelf = (req, target, message) => {
  if (req.admin && req.admin.id === target.id) throw new ApiError(403, message);
};

// Blocks removing the last active super admin (demotion or deactivation).
const assertOtherActiveSuperadmin = async (target) => {
  if (normalizeRole(target.role) !== "superadmin" || target.isActive === false) return;
  const admins = await listCollection("admins", { includeInactive: true });
  const others = admins.filter(
    (admin) =>
      admin.id !== target.id && admin.isActive !== false && normalizeRole(admin.role) === "superadmin"
  );
  if (others.length === 0) throw conflict(LAST_SUPERADMIN_MESSAGE);
};

const auditUser = (req, action, user, summary, changes = []) =>
  audit(req, { action, entity: "user", entityId: user.id, summary, changes });

// GET /admin/users
export const adminListUsers = asyncHandler(async (_req, res) => {
  const admins = await listCollection("admins", { includeInactive: true });
  const users = admins
    .map(adminView)
    .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  ok(res, "Users retrieved.", users);
});

// GET /admin/users/:id
export const adminGetUser = asyncHandler(async (req, res) => {
  ok(res, "User retrieved.", adminView(await getCollectionItem("admins", req.params.id)));
});

// POST /admin/users { name, email, role, password }
export const adminCreateUser = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const name = requiredString(body, "name", "Name", { max: LIMITS.adminName });
  const email = normalizeEmail(
    validateEmail(requiredString(body, "email", "Email address", { max: LIMITS.email }), true)
  );
  const role = roleField(body);
  const password = validatePassword(
    requiredString(body, "password", "Password", { max: LIMITS.passwordMax }),
    email
  );
  assertCanManage(req, role);

  if (await findCollectionItem("admins", { email })) throw conflict(EMAIL_TAKEN_MESSAGE);
  const passwordHash = await hashPassword(password);
  const user = await createCollectionItem(
    "admins",
    {
      name,
      email,
      role,
      passwordHash,
      isActive: true,
      passwordChangedAt: new Date().toISOString(),
    },
    {
      // JSON store: re-checked inside the write lock.
      prepare: (items, item) => {
        if (items.some((existing) => normalizeEmail(existing.email) === email)) {
          throw conflict(EMAIL_TAKEN_MESSAGE);
        }
        return item;
      },
    }
  );

  auditUser(req, "user.create", user, `Created ${role} account ${email}`, ["name", "email", "role"]);
  created(res, "User created.", adminView(user));
});

// PUT /admin/users/:id/role { role }
export const adminChangeUserRole = asyncHandler(async (req, res) => {
  const role = roleField(req.body);
  const existing = await getCollectionItem("admins", req.params.id);
  assertNotSelf(req, existing, "You cannot change your own role.");
  assertCanManage(req, existing.role);
  assertCanManage(req, role);

  const previous = normalizeRole(existing.role);
  if (previous === role) {
    ok(res, "User role unchanged.", adminView(existing));
    return;
  }
  if (role !== "superadmin") await assertOtherActiveSuperadmin(existing);

  // Capabilities are resolved from the stored role on every request, so the
  // change applies to existing sessions immediately.
  const user = await updateCollectionItem("admins", existing.id, { role });
  auditUser(
    req,
    "user.role_change",
    user,
    `Changed role of ${user.email} from ${previous || existing.role || "none"} to ${role}`,
    ["role"]
  );
  ok(res, "User role updated.", adminView(user));
});

const setActive = (isActive) =>
  asyncHandler(async (req, res) => {
    const existing = await getCollectionItem("admins", req.params.id);
    assertCanManage(req, existing.role);

    if (!isActive) {
      assertNotSelf(req, existing, "You cannot deactivate your own account.");
      await assertOtherActiveSuperadmin(existing);
    }
    if ((existing.isActive !== false) === isActive) {
      ok(res, isActive ? "User is already active." : "User is already inactive.", adminView(existing));
      return;
    }

    const user = await updateCollectionItem("admins", existing.id, { isActive });
    if (!isActive) await revokeAdminSessions(user.id);
    auditUser(
      req,
      isActive ? "user.reactivate" : "user.deactivate",
      user,
      `${isActive ? "Reactivated" : "Deactivated"} ${user.email}${isActive ? "" : "; sessions revoked"}`,
      ["isActive"]
    );
    ok(res, isActive ? "User reactivated." : "User deactivated.", adminView(user));
  });

// POST /admin/users/:id/deactivate and /reactivate
export const adminDeactivateUser = setActive(false);
export const adminReactivateUser = setActive(true);
