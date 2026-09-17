// Admin authentication: password hashing, signed tokens backed by D1 sessions,
// login attempt counters / lockouts, password reset tokens and the D1 fixed-window
// rate limiter.
import { ApiError, describeError, getClientIp, getUserAgent, minutesText, retryAfterSeconds, warnOnce } from "./http.js";
import { changesOf, createCollectionItem, findByField, getById, now, updateCollectionItem } from "./store.js";
import {
  base64urlDecode,
  base64urlEncode,
  bytesToHex,
  hmacHex,
  randomBase64url,
  randomHex,
  sha256Hex,
  textEncoder,
  timingSafeEqualStrings,
} from "./security.js";
import { STATIC_ADMIN as STATIC_IDENTITY } from "../../shared/capabilities.js";
import { isUsableSecret, isValidEmail, passwordMeetsPolicy } from "./validation.js";

const MINUTE_MS = 60 * 1000;
export const TOKEN_TTL_MS = 8 * 60 * MINUTE_MS;
export const SESSION_IDLE_TIMEOUT_MS = 2 * 60 * MINUTE_MS;
const SESSION_TOUCH_INTERVAL_MS = 5 * MINUTE_MS;
// 100,000 is the highest PBKDF2 iteration count the Workers runtime allows.
const PBKDF2_ITERATIONS = 100000;
const CLEANUP_PROBABILITY = 0.02;

const NOT_CONFIGURED = "Admin authentication is not configured.";

// ---------------------------------------------------------------------------
// Secrets (fix plan A2/A3)
// ---------------------------------------------------------------------------

const rejectedSecretWarning = (name) =>
  `${name} is rejected: it must be at least 32 characters and not a placeholder (replace-with..., change-me..., example...). Generate one with: openssl rand -base64 48`;

// ADMIN_AUTH_SECRET is the only HMAC signing key. Missing or invalid: 500.
export const getSigningSecret = (env) => {
  const secret = env.ADMIN_AUTH_SECRET;
  if (isUsableSecret(secret)) return secret;
  if (secret) warnOnce("admin-auth-secret-rejected", rejectedSecretWarning("ADMIN_AUTH_SECRET"));
  warnOnce("admin-auth-secret-missing", `${NOT_CONFIGURED} Set ADMIN_AUTH_SECRET (32+ characters).`);
  throw new ApiError(500, NOT_CONFIGURED);
};

const usableStaticToken = (env) => {
  if (!env.ADMIN_TOKEN) return null;
  if (!isUsableSecret(env.ADMIN_TOKEN)) {
    warnOnce("admin-token-rejected", rejectedSecretWarning("ADMIN_TOKEN"));
    return null;
  }
  warnOnce(
    "static-admin-token",
    "ADMIN_TOKEN is set. It grants permanent admin access without a session; remove it once admin accounts are in use."
  );
  return env.ADMIN_TOKEN;
};

// ---------------------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------------------

export const hashPassword = async (password, salt = randomHex(16), rounds = PBKDF2_ITERATIONS) => {
  const key = await crypto.subtle.importKey("raw", textEncoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: textEncoder.encode(salt), iterations: rounds, hash: "SHA-256" },
    key,
    256
  );
  return `pbkdf2:${rounds}:${salt}:${bytesToHex(hash)}`;
};

export const verifyPassword = async (password, stored = "") => {
  const [scheme, rounds, salt, hash] = String(stored || "").split(":");
  const iterations = Number(rounds);
  if (scheme !== "pbkdf2" || !salt || !hash || !Number.isInteger(iterations) || iterations < 1 || iterations > PBKDF2_ITERATIONS) {
    return false;
  }
  return timingSafeEqualStrings(await hashPassword(password, salt, iterations), stored);
};

// Used when the account does not exist so the response time matches a real check.
const DUMMY_HASH = `pbkdf2:${PBKDF2_ITERATIONS}:${"0".repeat(32)}:${"0".repeat(64)}`;
export const burnPasswordCheck = (password) => verifyPassword(password, DUMMY_HASH).then(() => false);

// ---------------------------------------------------------------------------
// Rate limiting (migrations/0002_rate_limits.sql)
// ---------------------------------------------------------------------------

const RATE_LIMITS = {
  loginIp: { limit: 20, windowMs: 15 * MINUTE_MS, message: "Too many sign-in attempts. Try again in" },
  loginFailedAudit: { limit: 5, windowMs: 15 * MINUTE_MS },
  resetRequestIp: { limit: 3, windowMs: 60 * MINUTE_MS, message: "Too many password reset requests. Try again in" },
  resetRequestEmail: { limit: 3, windowMs: 60 * MINUTE_MS, message: "Too many password reset requests. Try again in" },
  resetConfirmIp: { limit: 10, windowMs: 60 * MINUTE_MS },
  publicWrite: { limit: 30, windowMs: 10 * MINUTE_MS },
  quote: { limit: 60, windowMs: 10 * MINUTE_MS },
  // Per admin (UPLOADS_V1 §2).
  upload: { limit: 60, windowMs: 10 * MINUTE_MS },
};

// Fixed-window counter stored in D1. The single UPSERT ... RETURNING statement is
// atomic, so concurrent requests cannot both read a stale count. Returns
// { count, resetAt, limited } or null when the table is missing / D1 errors (fail open).
export const hitRateLimit = async (env, ctx, name, identity) => {
  const { limit, windowMs } = RATE_LIMITS[name];
  const key = `${name}:${identity}`;
  const currentTime = Date.now();

  let row;
  try {
    row = await env.DB.prepare(
      `INSERT INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?)
        ON CONFLICT(key) DO UPDATE SET
          count = CASE WHEN rate_limits.reset_at <= ? THEN 1 ELSE rate_limits.count + 1 END,
          reset_at = CASE WHEN rate_limits.reset_at <= ? THEN excluded.reset_at ELSE rate_limits.reset_at END
        RETURNING count, reset_at`
    )
      .bind(key, currentTime + windowMs, currentTime, currentTime)
      .first();
  } catch (error) {
    console.warn(
      `Rate limiting skipped for ${name}; apply migrations/0002_rate_limits.sql if the table is missing.`,
      describeError(error)
    );
    return null;
  }

  if (Math.random() < CLEANUP_PROBABILITY) {
    ctx?.waitUntil?.(
      env.DB.prepare("DELETE FROM rate_limits WHERE reset_at <= ?")
        .bind(currentTime)
        .run()
        .catch((error) => console.warn("Rate limit cleanup failed", describeError(error)))
    );
  }

  if (!row) return null;
  const resetAt = Number(row.reset_at);
  return { count: Number(row.count), resetAt, limited: Number(row.count) > limit, remainingMs: resetAt - currentTime };
};

export const enforceRateLimit = async (env, ctx, name, identity) => {
  const outcome = await hitRateLimit(env, ctx, name, identity);
  if (!outcome?.limited) return;
  const remainingMs = Math.max(outcome.remainingMs, 1000);
  const prefix = RATE_LIMITS[name].message || "Too many requests. Please try again in";
  throw new ApiError(429, `${prefix} ${minutesText(remainingMs)}.`, undefined, {
    "Retry-After": retryAfterSeconds(remainingMs),
  });
};

// ---------------------------------------------------------------------------
// Login attempt counters (login_failures, migrations/0004_admin_security.sql)
// Keys: "pair:<email>|<ip prefix>" (threshold 5) and "email:<email>" (threshold 30).
// ---------------------------------------------------------------------------

const LOGIN_WINDOW_MS = 15 * MINUTE_MS;
const LOCK_DURATION_MS = 15 * MINUTE_MS;
export const PAIR_ATTEMPT_LIMIT = 5;
export const EMAIL_ATTEMPT_LIMIT = 30;

export const pairKey = (email, prefix) => `pair:${email}|${prefix}`;
export const emailKey = (email) => `email:${email}`;

const lockoutError = (remainingMs) => {
  const ms = Math.max(remainingMs, 1000);
  return new ApiError(429, `Too many failed sign-in attempts. Try again in ${minutesText(ms)}.`, undefined, {
    "Retry-After": retryAfterSeconds(ms),
  });
};

// Atomically counts one attempt (before any password hashing) and throws the lockout
// 429 when the count is over the threshold or a lock is active. The lock is set once,
// for 15 minutes, when the count first goes over the threshold. Fails open (with a
// warning) if the table is missing.
export const countLoginAttempt = async (env, ctx, key, threshold) => {
  const currentTime = Date.now();
  let row;
  try {
    row = await env.DB.prepare(
      `INSERT INTO login_failures (email, count, window_start, locked_until) VALUES (?1, 1, ?2, NULL)
        ON CONFLICT(email) DO UPDATE SET
          count = CASE
            WHEN login_failures.window_start <= ?3 AND (login_failures.locked_until IS NULL OR login_failures.locked_until <= ?2)
            THEN 1 ELSE login_failures.count + 1 END,
          window_start = CASE
            WHEN login_failures.window_start <= ?3 AND (login_failures.locked_until IS NULL OR login_failures.locked_until <= ?2)
            THEN ?2 ELSE login_failures.window_start END,
          locked_until = CASE
            WHEN login_failures.locked_until > ?2 THEN login_failures.locked_until
            WHEN login_failures.window_start <= ?3 THEN NULL
            WHEN login_failures.count + 1 > ?4 THEN ?5
            ELSE NULL END
        RETURNING count, locked_until`
    )
      .bind(key, currentTime, currentTime - LOGIN_WINDOW_MS, threshold, currentTime + LOCK_DURATION_MS)
      .first();
  } catch (error) {
    console.warn(
      "Login attempt counter skipped; apply migrations/0004_admin_security.sql if the table is missing.",
      describeError(error)
    );
    return;
  }

  if (Math.random() < CLEANUP_PROBABILITY) {
    ctx?.waitUntil?.(
      env.DB.prepare("DELETE FROM login_failures WHERE window_start <= ? AND (locked_until IS NULL OR locked_until <= ?)")
        .bind(currentTime - LOGIN_WINDOW_MS, currentTime)
        .run()
        .catch((error) => console.warn("Login counter cleanup failed", describeError(error)))
    );
  }

  const lockedUntil = row?.locked_until === null || row?.locked_until === undefined ? 0 : Number(row.locked_until);
  if (lockedUntil > currentTime) throw lockoutError(lockedUntil - currentTime);
  if (row && Number(row.count) > threshold) throw lockoutError(LOCK_DURATION_MS);
};

export const clearLoginCounters = (env, email, prefix) =>
  env.DB.prepare("DELETE FROM login_failures WHERE email = ? OR email = ?")
    .bind(pairKey(email, prefix), emailKey(email))
    .run()
    .catch((error) => console.warn("Clearing login counters failed", describeError(error)));

// Clears every counter for the email (all IP prefixes), e.g. after a password reset.
export const clearAllLoginCounters = (env, email) => {
  const prefix = `pair:${email}|`;
  return env.DB.prepare("DELETE FROM login_failures WHERE email = ? OR substr(email, 1, ?) = ?")
    .bind(emailKey(email), prefix.length, prefix)
    .run()
    .catch((error) => console.warn("Clearing login counters failed", describeError(error)));
};

// ---------------------------------------------------------------------------
// Sessions and tokens (admin_sessions in migrations/0004_admin_security.sql)
// ---------------------------------------------------------------------------

export const createSession = async (env, ctx, request, admin) => {
  const currentTime = Date.now();
  const session = {
    id: randomBase64url(32),
    adminId: admin.id,
    createdAt: currentTime,
    expiresAt: currentTime + TOKEN_TTL_MS,
  };
  await env.DB.prepare(
    `INSERT INTO admin_sessions (id, admin_id, created_at, expires_at, last_seen_at, revoked_at, ip, user_agent)
      VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`
  )
    .bind(
      session.id,
      session.adminId,
      session.createdAt,
      session.expiresAt,
      currentTime,
      getClientIp(request),
      getUserAgent(request)
    )
    .run();

  if (Math.random() < CLEANUP_PROBABILITY) {
    ctx?.waitUntil?.(
      env.DB.prepare("DELETE FROM admin_sessions WHERE expires_at <= ? OR last_seen_at <= ?")
        .bind(currentTime, currentTime - SESSION_IDLE_TIMEOUT_MS)
        .run()
        .catch((error) => console.warn("Session cleanup failed", describeError(error)))
    );
  }
  return session;
};

export const createAdminToken = async (env, admin, session) => {
  const secret = getSigningSecret(env);
  const payload = base64urlEncode({
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
    sid: session.id,
    exp: session.expiresAt,
  });
  return `${payload}.${await hmacHex(secret, payload)}`;
};

export const revokeSession = (env, sessionId) =>
  env.DB.prepare("UPDATE admin_sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL")
    .bind(Date.now(), sessionId)
    .run();

// Deactivation: every live session of the admin ends.
export const revokeAdminSessions = (env, adminId) =>
  env.DB.prepare("UPDATE admin_sessions SET revoked_at = ? WHERE admin_id = ? AND revoked_at IS NULL")
    .bind(Date.now(), adminId)
    .run();

const verifyAdminToken = async (env, ctx, token = "") => {
  const secret = getSigningSecret(env);
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  if (!(await timingSafeEqualStrings(await hmacHex(secret, payload), signature))) return null;
  let decoded;
  try {
    decoded = JSON.parse(base64urlDecode(payload));
  } catch {
    return null;
  }
  const currentTime = Date.now();
  if (
    !decoded?.adminId ||
    typeof decoded.sid !== "string" ||
    !decoded.sid ||
    typeof decoded.exp !== "number" ||
    decoded.exp < currentTime
  ) {
    return null;
  }

  const session = await env.DB.prepare(
    "SELECT admin_id, expires_at, last_seen_at, revoked_at FROM admin_sessions WHERE id = ?"
  )
    .bind(decoded.sid)
    .first();
  if (
    !session ||
    session.revoked_at !== null ||
    Number(session.expires_at) <= currentTime ||
    currentTime - Number(session.last_seen_at || 0) > SESSION_IDLE_TIMEOUT_MS ||
    session.admin_id !== decoded.adminId
  ) {
    return null;
  }

  const admin = await getById(env, "admins", decoded.adminId).catch(() => null);
  if (!admin || admin.isActive === false || admin.id !== decoded.adminId) return null;
  if (admin.passwordChangedAt && new Date(admin.passwordChangedAt).getTime() > decoded.exp - TOKEN_TTL_MS) {
    return null;
  }

  if (currentTime - Number(session.last_seen_at || 0) >= SESSION_TOUCH_INTERVAL_MS) {
    const touch = env.DB.prepare("UPDATE admin_sessions SET last_seen_at = ? WHERE id = ?")
      .bind(currentTime, decoded.sid)
      .run()
      .catch((error) => console.warn("Session touch failed", describeError(error)));
    ctx?.waitUntil?.(touch);
  }

  return { admin, sessionId: decoded.sid, isStatic: false };
};

// The static ADMIN_TOKEN acts as a superadmin (shared/capabilities.js).
export const STATIC_ADMIN = STATIC_IDENTITY;

const extractToken = (request) =>
  request.headers.get("x-admin-token") || request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") || "";

// Resolves { admin, sessionId, isStatic } or throws 401 (500 when auth is not configured).
// A usable static ADMIN_TOKEN works without ADMIN_AUTH_SECRET; everything else needs the secret.
export const requireAdmin = async (request, env, ctx) => {
  const token = extractToken(request);
  const staticToken = usableStaticToken(env);
  if (staticToken && token && (await timingSafeEqualStrings(token, staticToken))) {
    return { admin: STATIC_ADMIN, sessionId: null, isStatic: true };
  }

  const result = await verifyAdminToken(env, ctx, token);
  if (!result) throw new ApiError(401, "Admin authorization is required.");
  return result;
};

// ---------------------------------------------------------------------------
// Super admin seed
// ---------------------------------------------------------------------------

export const seedSuperAdmin = async (env) => {
  const email = String(env.SUPERADMIN_EMAIL || env.ADMIN_USERNAME || "").trim().toLowerCase();
  const password = env.SUPERADMIN_PASSWORD || env.ADMIN_PASSWORD;
  if (!email || !password) return null;
  if (!isValidEmail(email)) {
    warnOnce("seed-email-invalid", "Super admin not seeded: SUPERADMIN_EMAIL is not a valid email address.");
    return null;
  }

  const existing = await findByField(env, "admins", "email", email);
  if (existing) return existing;

  if (typeof password !== "string" || !passwordMeetsPolicy(password, email)) {
    warnOnce(
      "seed-password-weak",
      "Super admin not seeded: SUPERADMIN_PASSWORD must be 12-128 characters, must not contain the email name and must not be a placeholder."
    );
    return null;
  }

  // A fixed id per email means two concurrent first logins cannot create two admins.
  const id = `superadmin-${(await sha256Hex(email)).slice(0, 32)}`;
  try {
    const admin = await createCollectionItem(
      env,
      "admins",
      {
        name: String(env.SUPERADMIN_NAME || "Super Admin").slice(0, 100),
        email,
        passwordHash: await hashPassword(password),
        role: "superadmin",
        isActive: true,
        passwordChangedAt: now(),
      },
      { id }
    );
    console.log("Super admin seeded.");
    return admin;
  } catch {
    return findByField(env, "admins", "email", email);
  }
};

// ---------------------------------------------------------------------------
// Password reset tokens (stored in records, collection passwordResets)
// ---------------------------------------------------------------------------

export const RESET_TTL_MS = 30 * MINUTE_MS;
const MAX_RESET_TOKENS = 3;

const resetTokenHash = async (token) => `sha256:${await sha256Hex(token)}`;

// Creates a token for an active admin and prunes used/expired/excess tokens for the email.
// Returns { token, expiresAt } (or null when there is no such active admin).
export const createResetToken = async (env, email) => {
  await seedSuperAdmin(env);
  const admin = await findByField(env, "admins", "email", email);
  if (!admin || admin.isActive === false) return { admin: null, token: null };

  const token = randomHex(32);
  const reset = await createCollectionItem(env, "passwordResets", {
    adminId: admin.id,
    email,
    tokenHash: await resetTokenHash(token),
    expiresAt: new Date(Date.now() + RESET_TTL_MS).toISOString(),
    usedAt: null,
  });

  const rows = await env.DB.prepare(
    "SELECT id, data FROM records WHERE collection = 'passwordResets' AND json_extract(data, '$.email') = ? ORDER BY created_at DESC, id DESC"
  )
    .bind(email)
    .all();
  const currentIso = now();
  let kept = 0;
  const stale = [];
  for (const row of rows.results || []) {
    const record = JSON.parse(row.data);
    const usable = !record.usedAt && record.expiresAt > currentIso && String(record.tokenHash || "").startsWith("sha256:");
    if (usable && row.id === reset.id) kept += 1;
    else if (usable && kept < MAX_RESET_TOKENS) kept += 1;
    else stale.push(row.id);
  }
  for (const id of stale.filter((staleId) => staleId !== reset.id)) {
    await env.DB.prepare("DELETE FROM records WHERE collection = 'passwordResets' AND id = ?").bind(id).run();
  }
  return { admin, token, expiresAt: reset.expiresAt };
};

// Consumes a reset token atomically and changes the password in one batch.
// Returns the admin on success, or null (invalid, expired, used, or lost a race).
export const consumeResetToken = async (env, email, token, newPassword) => {
  const admin = await findByField(env, "admins", "email", email);
  const row = await env.DB.prepare(
    `SELECT id, data FROM records
      WHERE collection = 'passwordResets' AND json_extract(data, '$.email') = ? AND json_extract(data, '$.tokenHash') = ?
      LIMIT 1`
  )
    .bind(email, await resetTokenHash(token))
    .first();
  const reset = row ? JSON.parse(row.data) : null;
  const currentTime = Date.now();
  if (
    !admin ||
    admin.isActive === false ||
    !reset ||
    reset.usedAt ||
    reset.adminId !== admin.id ||
    !(new Date(reset.expiresAt).getTime() > currentTime)
  ) {
    return null;
  }

  const passwordHash = await hashPassword(newPassword);
  const nonce = randomHex(16);
  const timestamp = now();
  const nowMs = Date.now();
  const consumed = "EXISTS (SELECT 1 FROM records WHERE collection = 'passwordResets' AND id = ? AND json_extract(data, '$.consumeNonce') = ?)";

  const results = await env.DB.batch([
    env.DB.prepare(
      `UPDATE records
        SET data = json_set(data, '$.usedAt', ?, '$.consumeNonce', ?, '$.updatedAt', ?), updated_at = ?
        WHERE collection = 'passwordResets' AND id = ?
          AND json_extract(data, '$.usedAt') IS NULL
          AND json_extract(data, '$.expiresAt') > ?`
    ).bind(timestamp, nonce, timestamp, timestamp, reset.id, timestamp),
    env.DB.prepare(
      `UPDATE records
        SET data = json_set(data, '$.passwordHash', ?, '$.passwordChangedAt', ?, '$.updatedAt', ?), updated_at = ?
        WHERE collection = 'admins' AND id = ? AND ${consumed}`
    ).bind(passwordHash, timestamp, timestamp, timestamp, admin.id, reset.id, nonce),
    env.DB.prepare(
      `UPDATE admin_sessions SET revoked_at = ? WHERE admin_id = ? AND revoked_at IS NULL AND ${consumed}`
    ).bind(nowMs, admin.id, reset.id, nonce),
  ]);

  if (changesOf(results?.[0]) !== 1) return null;
  return admin;
};

// Deletes used and expired reset records (opportunistic).
export const pruneResetTokens = (env) =>
  env.DB.prepare(
    `DELETE FROM records WHERE collection = 'passwordResets'
      AND (json_extract(data, '$.usedAt') IS NOT NULL OR json_extract(data, '$.expiresAt') <= ?)`
  )
    .bind(now())
    .run()
    .catch((error) => console.warn("Reset token cleanup failed", describeError(error)));

// After a successful login: write only lastLoginAt (never the whole admin document).
export const touchLastLogin = (env, adminId) =>
  updateCollectionItem(env, "admins", adminId, { lastLoginAt: now() }).catch((error) =>
    console.warn("Updating lastLoginAt failed", describeError(error))
  );
