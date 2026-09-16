// Admin user management (API_CONTRACT_V3 §2). Parity: backend/cloudflare/src/adminUsers.js.
import config from "../config.js";
import passwordResetTemplate from "../mail/_passwordReset.js";
import { sendMail } from "../mail/mail.js";
import { actingAdmin } from "../middleware/capabilities.js";
import {
  Q_MAX,
  USER_MESSAGES,
  checkUserChange,
  filterAdmins,
  paginate,
  parseRole,
  roleChangeSummary,
} from "../shared/adminUsers.js";
import {
  FORBIDDEN_MESSAGE,
  adminUser,
  canManageRole,
  emptyStaffProfile,
  normalizeRole,
} from "../shared/capabilities.js";
import {
  createPasswordReset,
  normalizeEmail,
  revokeAdminSessions,
} from "../services/adminAuthService.js";
import { asyncHandler } from "../services/asyncHandler.js";
import { audit, changedFields } from "../services/audit.js";
import { ApiError, badRequest } from "../services/errors.js";
import { created, ok } from "../services/http.js";
import { pageQuery } from "../services/pagination.js";
import { runInBackground } from "../services/runtime.js";
import {
  createCollectionItem,
  findCollectionItem,
  listCollection,
  updateCollectionItem,
} from "../services/store.js";
import {
  LIMITS,
  optionalPhone,
  requiredString,
  validateEmail,
} from "../services/validators.js";

const roleField = (body) => {
  const role = parseRole(body?.role);
  if (!role) throw badRequest(USER_MESSAGES.roleInvalid);
  return role;
};

// phone: the existing phone rule, or null (absent/blank/null -> null).
const phoneField = (body) => optionalPhone(body, "phone", "Phone number") || null;

const findUser = async (id) => {
  const user = await findCollectionItem("admins", { id: String(id) });
  if (!user) throw new ApiError(404, USER_MESSAGES.notFound);
  return user;
};

const fail = (result) => {
  if (result) throw new ApiError(result.status, result.message);
};

// Legacy "super_admin" is rewritten on the next write of the record (§1.1).
const withRoleRewrite = (existing, patch) =>
  existing.role !== normalizeRole(existing.role) && patch.role === undefined
    ? { ...patch, role: normalizeRole(existing.role) }
    : patch;

const auditUser = (req, action, user, summary, changes) =>
  audit(req, { action, entity: "user", entityId: user.id, summary, changes });

const sendInvite = (req, email) =>
  runInBackground("Admin invite", async () => {
    const reset = await createPasswordReset(email);
    if (!reset) return;
    await sendMail(
      {
        to: reset.email,
        subject: `Set up your ${config.application_name} admin account`,
        data: { ...reset, adminUrl: config.admin_app_url },
      },
      passwordResetTemplate
    );
  });

const queryFilters = (query = {}) => {
  const filters = {};
  if (query.role !== undefined && query.role !== "") {
    filters.role = parseRole(query.role);
    if (!filters.role) throw badRequest(USER_MESSAGES.roleInvalid);
  }
  if (query.isActive !== undefined && query.isActive !== "") {
    if (query.isActive !== "true" && query.isActive !== "false") {
      throw badRequest(USER_MESSAGES.isActiveInvalid);
    }
    filters.isActive = query.isActive === "true";
  }
  if (query.q !== undefined && query.q !== "") {
    if (typeof query.q !== "string") throw badRequest("q must be text.");
    if (query.q.length > Q_MAX) throw badRequest(USER_MESSAGES.qTooLong);
    filters.q = query.q.trim();
  }
  return filters;
};

// GET /admin/users?page&limit&role&isActive&q (paged)
export const adminListUsers = asyncHandler(async (req, res) => {
  const { page, limit } = pageQuery(req.query);
  const filters = queryFilters(req.query);
  const admins = await listCollection("admins", { includeInactive: true });
  const { items, total } = paginate(filterAdmins(admins, filters), page, limit);
  ok(res, USER_MESSAGES.list, { items: items.map(adminUser), page, limit, total });
});

// GET /admin/users/:id
export const adminGetUser = asyncHandler(async (req, res) => {
  ok(res, USER_MESSAGES.get, adminUser(await findUser(req.params.id)));
});

// POST /admin/users { name, email, role, phone? } -> invite email, no usable password until reset.
export const adminCreateUser = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const name = requiredString(body, "name", "Name", { max: LIMITS.adminName });
  const email = validateEmail(
    requiredString(body, "email", "Email address", { max: LIMITS.email }),
    true
  );
  const role = roleField(body);
  const phone = phoneField(body);
  if (!canManageRole(actingAdmin(req), role)) throw new ApiError(403, FORBIDDEN_MESSAGE);

  const emailTaken = () => new ApiError(409, USER_MESSAGES.emailTaken);
  if (await findCollectionItem("admins", { email })) throw emailTaken();

  let user;
  try {
    user = await createCollectionItem(
      "admins",
      {
        name,
        email,
        role,
        phone,
        profile: emptyStaffProfile(),
        passwordHash: null,
        isActive: true,
        lastLoginAt: null,
      },
      {
        // JSON store: re-checked inside the write lock.
        prepare: (items, item) => {
          if (items.some((existing) => normalizeEmail(existing.email) === email)) throw emailTaken();
          return item;
        },
      }
    );
  } catch (error) {
    if (error?.code === 11000) throw emailTaken();
    throw error;
  }

  sendInvite(req, email);
  auditUser(req, "user.create", user, `Created ${role} account ${email}`, ["name", "email", "role", "phone"]);
  created(res, USER_MESSAGES.create, adminUser(user));
});

// PUT /admin/users/:id { name?, phone? }
export const adminUpdateUser = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const patch = {};
  if (body.name !== undefined) {
    patch.name = requiredString(body, "name", "Name", { max: LIMITS.adminName });
  }
  if (body.phone !== undefined) patch.phone = phoneField(body);

  const existing = await findUser(req.params.id);
  if (!canManageRole(actingAdmin(req), existing.role)) throw new ApiError(403, FORBIDDEN_MESSAGE);

  const changes = changedFields(existing, patch, Object.keys(patch));
  const user = changes.length
    ? await updateCollectionItem("admins", existing.id, withRoleRewrite(existing, patch))
    : existing;
  if (changes.length) auditUser(req, "user.update", user, `Updated account ${user.email}`, changes);
  ok(res, USER_MESSAGES.update, adminUser(user));
});

// POST /admin/users/:id/role { role }
export const adminChangeUserRole = asyncHandler(async (req, res) => {
  const role = roleField(req.body);
  const existing = await findUser(req.params.id);
  const admins = await listCollection("admins", { includeInactive: true });
  fail(
    checkUserChange({
      actor: actingAdmin(req),
      target: existing,
      nextRole: role,
      admins,
      forbiddenMessage: FORBIDDEN_MESSAGE,
    })
  );

  const previous = normalizeRole(existing.role);
  if (previous === role && existing.role === role) {
    ok(res, USER_MESSAGES.role, adminUser(existing));
    return;
  }
  // The role is read from the stored record on every request, so this applies
  // to the account's next request.
  const user = await updateCollectionItem("admins", existing.id, { role });
  if (previous !== role) {
    auditUser(req, "user.role_change", user, roleChangeSummary(user, previous, role), ["role"]);
  }
  ok(res, USER_MESSAGES.role, adminUser(user));
});

const setActive = (isActive) =>
  asyncHandler(async (req, res) => {
    const existing = await findUser(req.params.id);
    const admins = await listCollection("admins", { includeInactive: true });
    fail(
      checkUserChange({
        actor: actingAdmin(req),
        target: existing,
        nextActive: isActive,
        admins,
        forbiddenMessage: FORBIDDEN_MESSAGE,
      })
    );

    const message = isActive ? USER_MESSAGES.reactivate : USER_MESSAGES.deactivate;
    if ((existing.isActive !== false) === isActive) {
      if (!isActive) await revokeAdminSessions(existing.id);
      ok(res, message, adminUser(existing));
      return;
    }
    const user = await updateCollectionItem("admins", existing.id, withRoleRewrite(existing, { isActive }));
    if (!isActive) await revokeAdminSessions(user.id);
    auditUser(
      req,
      isActive ? "user.reactivate" : "user.deactivate",
      user,
      `${isActive ? "Reactivated" : "Deactivated"} account ${user.email}`,
      ["isActive"]
    );
    ok(res, message, adminUser(user));
  });

// POST /admin/users/:id/deactivate and /reactivate (idempotent)
export const adminDeactivateUser = setActive(false);
export const adminReactivateUser = setActive(true);
