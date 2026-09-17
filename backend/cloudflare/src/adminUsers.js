// Admin user management (API_CONTRACT_V3 §2). Parity: backend/controllers/adminUsers.js.
import { adminInviteEmail } from "../../shared/adminInviteEmail.js";
import {
  USER_MESSAGES,
  checkUserChange,
  filterAdmins,
  hasActiveSuperadmin,
  paginate,
  parseRole,
  parseUserFilters,
  removesActiveSuperadmin,
  roleChangeSummary,
} from "../../shared/adminUsers.js";
import {
  FORBIDDEN_MESSAGE,
  adminUser,
  canManageRole,
  emptyStaffProfile,
  normalizeRole,
} from "../../shared/capabilities.js";
import { changedFields, recordAudit } from "./audit.js";
import { createResetToken, revokeAdminSessions } from "./auth.js";
import { requireCapability } from "./capabilities.js";
import { ApiError, badRequest, created, describeError, ok } from "./http.js";
import { createCollectionItem, findByField, getById, listCollection, updateCollectionItem } from "./store.js";
import { pageQuery, queryValue } from "./query.js";
import { LIMITS, phoneField, stringField, validateEmail } from "./validation.js";

const USER_ACTION = /^\/admin\/users\/([^/]+)\/(role|deactivate|reactivate)$/;
const USER_ID = /^\/admin\/users\/([^/]+)$/;

const roleField = (body) => {
  const role = parseRole(body?.role);
  if (!role) badRequest(USER_MESSAGES.roleInvalid);
  return role;
};

const nameField = (body) => stringField(body, "name", { label: "Name", required: true, max: LIMITS.adminName });

// phone: the existing phone rule, or null (absent/blank/null -> null).
const phoneOrNull = (body) => phoneField(body, "phone", { label: "Phone number" }) || null;

const findUser = async (env, id) => {
  const user = await getById(env, "admins", id);
  if (!user) throw new ApiError(404, USER_MESSAGES.notFound);
  return user;
};

const fail = (result) => {
  if (result) throw new ApiError(result.status, result.message);
};

const queryFilters = (params) => {
  const { filters, error } = parseUserFilters({
    role: queryValue(params, "role"),
    isActive: queryValue(params, "isActive"),
    q: queryValue(params, "q"),
  });
  if (error) badRequest(error);
  return filters;
};

// Post-write recount (review L1): if a concurrent change left no active superadmin,
// restore this account's previous values and answer the same 409.
const ensureSuperadminRemains = async (env, existing, restore) => {
  const admins = await listCollection(env, "admins", { includeInactive: true });
  if (hasActiveSuperadmin(admins)) return;
  await updateCollectionItem(env, "admins", existing.id, restore);
  throw new ApiError(409, USER_MESSAGES.lastSuperadmin);
};

const isUniqueViolation = (error) => /UNIQUE constraint failed|SQLITE_CONSTRAINT/i.test(String(error?.message));

/**
 * /admin/users routes. `sendNotification(env, { to, subject, text })` is the
 * Worker's email sender (index.js), used for the invite email.
 */
export const handleAdminUsers = async (request, env, ctx, path, body, admin, url, { sendNotification }) => {
  if (path !== "/admin/users" && !path.startsWith("/admin/users/")) return null;
  const { method } = request;
  const audit = (action, user, summary, changes) =>
    recordAudit(env, ctx, request, admin, { action, entity: "user", entityId: user.id, summary, changes });

  if (method === "GET" && path === "/admin/users") {
    requireCapability(admin, "users:read");
    const { page, limit } = pageQuery(url.searchParams);
    const filters = queryFilters(url.searchParams);
    const admins = await listCollection(env, "admins", { includeInactive: true });
    const { items, total } = paginate(filterAdmins(admins, filters), page, limit);
    return ok(USER_MESSAGES.list, { items: items.map(adminUser), page, limit, total });
  }

  if (method === "POST" && path === "/admin/users") {
    requireCapability(admin, "users:manage");
    const name = nameField(body);
    const email = validateEmail(
      stringField(body, "email", { label: "Email address", required: true, max: LIMITS.email }),
      { required: true }
    );
    const role = roleField(body);
    const phone = phoneOrNull(body);
    if (!canManageRole(admin, role)) throw new ApiError(403, FORBIDDEN_MESSAGE);

    if (await findByField(env, "admins", "email", email)) throw new ApiError(409, USER_MESSAGES.emailTaken);
    let user;
    try {
      user = await createCollectionItem(env, "admins", {
        name,
        email,
        role,
        phone,
        profile: emptyStaffProfile(),
        passwordHash: null,
        isActive: true,
        lastLoginAt: null,
      });
    } catch (error) {
      // idx_records_admins_email (migrations/0007_admin_roles.sql)
      if (isUniqueViolation(error)) throw new ApiError(409, USER_MESSAGES.emailTaken);
      throw error;
    }

    // Invite: a reset token by email; the account has no usable password until it is used.
    ctx.waitUntil(
      (async () => {
        const { token, expiresAt } = await createResetToken(env, email);
        if (!token) return;
        // Shared template, identical to the Express invite (review L6).
        const invite = adminInviteEmail({ name, email, role, token, expiresAt, adminUrl: env.ADMIN_APP_URL });
        await sendNotification(env, { to: email, subject: invite.subject, text: invite.text, html: invite.html });
      })().catch((error) => console.error("Admin invite failed:", describeError(error)))
    );
    audit("user.create", user, `Created ${role} account ${email}`, ["name", "email", "role", "phone"]);
    return created(USER_MESSAGES.create, adminUser(user));
  }

  const idMatch = USER_ID.exec(path);
  if (idMatch && method === "GET") {
    requireCapability(admin, "users:read");
    return ok(USER_MESSAGES.get, adminUser(await findUser(env, idMatch[1])));
  }

  if (idMatch && method === "PUT") {
    requireCapability(admin, "users:manage");
    const patch = {};
    if (body?.name !== undefined) patch.name = nameField(body);
    if (body?.phone !== undefined) patch.phone = phoneOrNull(body);

    const existing = await findUser(env, idMatch[1]);
    if (!canManageRole(admin, existing.role)) throw new ApiError(403, FORBIDDEN_MESSAGE);

    const changes = changedFields(existing, patch);
    if (changes.length && existing.role !== normalizeRole(existing.role)) patch.role = normalizeRole(existing.role);
    const user = changes.length ? await updateCollectionItem(env, "admins", existing.id, patch) : existing;
    if (changes.length) audit("user.update", user, `Updated account ${user.email}`, changes);
    return ok(USER_MESSAGES.update, adminUser(user));
  }

  const actionMatch = USER_ACTION.exec(path);
  if (!actionMatch) return null;
  const [, id, action] = actionMatch;

  if (action === "role" && method === "POST") {
    requireCapability(admin, "users:manage");
    const role = roleField(body);
    const existing = await findUser(env, id);
    const admins = await listCollection(env, "admins", { includeInactive: true });
    fail(checkUserChange({ actor: admin, target: existing, nextRole: role, admins, forbiddenMessage: FORBIDDEN_MESSAGE }));

    const previous = normalizeRole(existing.role);
    if (previous === role && existing.role === role) return ok(USER_MESSAGES.role, adminUser(existing));
    // The role is read from the stored record on every request, so this applies
    // to the account's next request.
    const user = await updateCollectionItem(env, "admins", existing.id, { role });
    if (removesActiveSuperadmin(existing, { nextRole: role })) {
      await ensureSuperadminRemains(env, existing, { role: existing.role });
    }
    if (previous !== role) audit("user.role_change", user, roleChangeSummary(user, previous, role), ["role"]);
    return ok(USER_MESSAGES.role, adminUser(user));
  }

  if ((action === "deactivate" || action === "reactivate") && method === "POST") {
    requireCapability(admin, "users:manage");
    const isActive = action === "reactivate";
    const existing = await findUser(env, id);
    const admins = await listCollection(env, "admins", { includeInactive: true });
    fail(checkUserChange({ actor: admin, target: existing, nextActive: isActive, admins, forbiddenMessage: FORBIDDEN_MESSAGE }));

    const message = isActive ? USER_MESSAGES.reactivate : USER_MESSAGES.deactivate;
    if ((existing.isActive !== false) === isActive) {
      if (!isActive) await revokeAdminSessions(env, existing.id);
      return ok(message, adminUser(existing));
    }
    const patch = { isActive };
    if (existing.role !== normalizeRole(existing.role)) patch.role = normalizeRole(existing.role);
    const user = await updateCollectionItem(env, "admins", existing.id, patch);
    if (removesActiveSuperadmin(existing, { nextActive: isActive })) {
      await ensureSuperadminRemains(env, existing, { isActive: true });
    }
    if (!isActive) await revokeAdminSessions(env, user.id);
    audit(
      isActive ? "user.reactivate" : "user.deactivate",
      user,
      `${isActive ? "Reactivated" : "Deactivated"} account ${user.email}`,
      ["isActive"]
    );
    return ok(message, adminUser(user));
  }

  return null;
};
