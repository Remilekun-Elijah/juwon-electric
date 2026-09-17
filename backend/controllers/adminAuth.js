import config from "../config.js";
import passwordResetTemplate from "../mail/_passwordReset.js";
import { sendMail } from "../mail/mail.js";
import { LIMIT_MESSAGES, LIMITS as RATE_LIMITS, enforceLimit } from "../middleware/rateLimit.js";
import { asyncHandler } from "../services/asyncHandler.js";
import { audit, requestIp, requestUserAgent } from "../services/audit.js";
import { ApiError, tooManyRequests } from "../services/errors.js";
import { ok } from "../services/http.js";
import { requestIpPrefix } from "../services/ip.js";
import { STATIC_ADMIN, adminSelf } from "../shared/capabilities.js";
import { runInBackground } from "../services/runtime.js";
import {
  AUTH_NOT_CONFIGURED_MESSAGE,
  clearAllLoginCounters,
  clearLoginCounters,
  completeAdminLogin,
  countLoginAttempt,
  createPasswordReset,
  getSigningKey,
  resetAdminPassword,
  revokeSession,
  shouldAuditLoginFailure,
  verifyAdminCredentials,
} from "../services/adminAuthService.js";
import {
  LIMITS,
  requiredString,
  validateEmail,
  validatePassword,
} from "../services/validators.js";

const RESET_REQUESTED_MESSAGE = "If the account exists, a password reset token has been sent.";

const emailField = (body) =>
  validateEmail(requiredString(body, "username", "Username", { max: LIMITS.email }), true);

// POST /admin/auth/login - order of checks (docs/API.md):
// 1 body, 2 per-IP limiter, 3 (email, IP prefix) counter, 4 per-email counter,
// 5 password, 6 success, 7 failure.
export const login = asyncHandler(async (req, res) => {
  if (!getSigningKey()) throw new ApiError(500, AUTH_NOT_CONFIGURED_MESSAGE);

  const email = emailField(req.body);
  const password = requiredString(req.body, "password", "Password", { max: LIMITS.passwordMax });
  const prefix = requestIpPrefix(req);

  await enforceLimit(req, res, "admin-login-ip", RATE_LIMITS.loginIp);

  const lockedMs = await countLoginAttempt(email, prefix);
  if (lockedMs > 0) throw tooManyRequests(res, LIMIT_MESSAGES.lockout(lockedMs), lockedMs);

  const verified = await verifyAdminCredentials(email, password);

  if (!verified) {
    if (await shouldAuditLoginFailure(prefix)) {
      audit(req, {
        action: "auth.login_failed",
        adminId: null,
        adminEmail: email,
        summary: "Failed sign-in attempt",
      });
    }
    throw new ApiError(401, "Invalid username or password.");
  }

  const result = await completeAdminLogin(verified, {
    password,
    ip: requestIp(req),
    userAgent: requestUserAgent(req),
  });
  await clearLoginCounters(email, prefix);
  audit(req, {
    action: "auth.login",
    adminId: result.admin.id,
    adminEmail: result.admin.email,
    entityId: null,
    summary: "Signed in",
  });

  ok(res, "Login successful.", { token: result.token, admin: result.admin });
});

// GET /admin/auth/me - the signed-in admin with role and capabilities.
export const me = asyncHandler(async (req, res) => {
  const admin = req.adminStaticToken
    ? adminSelf(STATIC_ADMIN, { isStatic: true })
    : adminSelf(req.admin);
  ok(res, "Session retrieved.", { admin });
});

export const logout = asyncHandler(async (req, res) => {
  if (req.adminStaticToken) {
    ok(res, "Static admin tokens cannot be signed out; remove ADMIN_TOKEN to revoke access.");
    return;
  }
  if (req.adminSession) {
    await revokeSession(req.adminSession.id);
    audit(req, { action: "auth.logout", summary: "Signed out" });
  }
  ok(res, "Signed out.");
});

// The raw token is only returned to local development requests that opted in.
// The Host header is used (not req.hostname, which trusts X-Forwarded-Host
// when trust proxy is enabled).
const mayExposeResetToken = (req) => {
  if (process.env.DEV_EXPOSE_RESET_TOKEN !== "true") return false;
  if (process.env.NODE_ENV === "production") return false;
  const host = String(req.headers.host || "").trim().toLowerCase();
  const hostname = host.startsWith("[") ? host.slice(0, host.indexOf("]") + 1) : host.split(":")[0];
  return hostname === "localhost" || hostname === "127.0.0.1";
};

const processResetRequest = async (req, email) => {
  const reset = await createPasswordReset(email);

  audit(req, {
    action: "auth.password_reset_requested",
    adminId: reset?.adminId ?? null,
    adminEmail: email,
    summary: `Password reset requested for ${email}`,
  });

  if (reset) {
    await sendMail(
      {
        to: reset.email,
        subject: `Your ${config.application_name} admin password reset token`,
        data: { ...reset, adminUrl: config.admin_app_url },
      },
      passwordResetTemplate
    );
  }
  return reset;
};

export const requestPasswordReset = asyncHandler(async (req, res) => {
  const email = emailField(req.body);

  await enforceLimit(req, res, "password-reset-request", RATE_LIMITS.resetRequest);
  await enforceLimit(req, res, "password-reset-request-email", RATE_LIMITS.resetRequest, email);

  if (mayExposeResetToken(req)) {
    // Local development only: the work happens before responding so the token
    // can be returned (no timing equalization in this mode).
    const reset = await processResetRequest(req, email);
    ok(res, RESET_REQUESTED_MESSAGE, {
      email,
      ...(reset ? { resetToken: reset.resetToken } : {}),
    });
    return;
  }

  // Same status, body and timing whether or not the account exists: the
  // lookup, insert, email and audit happen after the response.
  ok(res, RESET_REQUESTED_MESSAGE, { email });
  runInBackground("Password reset request", () => processResetRequest(req, email));
});

export const resetPassword = asyncHandler(async (req, res) => {
  const email = emailField(req.body);
  // Trimmed like the login endpoint trims, so the new password can sign in.
  const password = validatePassword(requiredString(req.body, "password", "New password"), email);
  const token = requiredString(req.body, "token", "Reset token", { max: LIMITS.resetToken });

  await enforceLimit(req, res, "password-reset-confirm", RATE_LIMITS.resetConfirm);

  const admin = await resetAdminPassword({ username: email, token, password });

  if (!admin) throw new ApiError(400, "Invalid or expired reset token.");
  await clearAllLoginCounters(email);
  audit(req, {
    action: "auth.password_reset",
    adminId: admin.id,
    adminEmail: admin.email,
    summary: "Password reset; all sessions revoked",
    changes: [],
  });
  ok(res, "Password reset successful.");
});
