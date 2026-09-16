import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "crypto";
import {
  deleteCounter,
  deleteCountersByPrefix,
  getCounter,
  hitCounter,
  setCounter,
} from "./counterStore.js";
import { track } from "./runtime.js";
import {
  createCollectionItem,
  deleteCollectionItemsByIds,
  deleteRecordsBefore,
  findCollectionItem,
  findCollectionItems,
  findRecord,
  insertRecord,
  updateCollectionItem,
  updateCollectionItemIf,
  updateRecords,
} from "./store.js";
import { passwordPolicyError } from "./validators.js";

const MINUTE_MS = 1000 * 60;
const TOKEN_TTL_MS = 8 * 60 * MINUTE_MS;
const SESSION_IDLE_MS = 2 * 60 * MINUTE_MS;
const RESET_TTL_MS = 30 * MINUTE_MS;
const SESSION_TOUCH_INTERVAL_MS = 5 * MINUTE_MS;
const MAX_ACTIVE_RESETS = 3;

export const LOGIN_LIMITS = {
  windowMs: 15 * MINUTE_MS,
  lockMs: 15 * MINUTE_MS,
  pairAttempts: 5,
  emailAttempts: 30,
  failureAuditsPerIp: 5,
};

export const AUTH_NOT_CONFIGURED_MESSAGE = "Admin authentication is not configured.";

// ---- configuration ------------------------------------------------------------

const PLACEHOLDER_PREFIXES = ["replace-with", "change-me", "example"];
const MIN_SECRET_LENGTH = 32;
const warnedOnce = new Set();
const warnOnce = (key, message) => {
  if (warnedOnce.has(key)) return;
  warnedOnce.add(key);
  console.warn(message);
};

export const isWeakSecret = (value) => {
  const text = String(value || "").trim();
  const lowered = text.toLowerCase();
  return (
    text.length < MIN_SECRET_LENGTH || PLACEHOLDER_PREFIXES.some((prefix) => lowered.startsWith(prefix))
  );
};

// A secret env value, or "" when unset or rejected (placeholder / too short).
const configuredSecret = (name) => {
  const value = String(process.env[name] || "").trim();
  if (!value) return "";
  if (isWeakSecret(value)) {
    warnOnce(
      `weak:${name}`,
      `${name} is ignored: it is a placeholder value or shorter than ${MIN_SECRET_LENGTH} characters. Generate one with: openssl rand -base64 48`
    );
    return "";
  }
  return value;
};

/** The static admin token when configured and strong enough, otherwise "". */
export const getStaticAdminToken = () => configuredSecret("ADMIN_TOKEN");

let fallbackSigningKey = null;

/**
 * HMAC key for session tokens: ADMIN_AUTH_SECRET only (never ADMIN_TOKEN).
 * Missing in production -> null (admin auth answers 500). Elsewhere a random
 * per-process key is used with a loud warning.
 */
export const getSigningKey = () => {
  const secret = configuredSecret("ADMIN_AUTH_SECRET");
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    warnOnce(
      "signing-missing",
      "ADMIN_AUTH_SECRET is missing or invalid: admin sign-in and admin routes answer 500 until it is set (at least 32 characters)."
    );
    return null;
  }
  if (!fallbackSigningKey) {
    fallbackSigningKey = randomBytes(32).toString("hex");
    console.warn(
      "\n**********************************************************************\n" +
        "WARNING: ADMIN_AUTH_SECRET is not set (or invalid). Using a random key for\n" +
        "this process only: admin sessions end on every restart and are not shared\n" +
        "across instances. Set ADMIN_AUTH_SECRET (openssl rand -base64 48).\n" +
        "In production (NODE_ENV=production) admin auth is disabled without it.\n" +
        "**********************************************************************"
    );
  }
  return fallbackSigningKey;
};

/** Logs configuration warnings once at startup. */
export const warnAuthConfig = () => {
  getStaticAdminToken();
  getSigningKey();
};

export const safeEqual = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

export const normalizeEmail = (email = "") => String(email || "").trim().toLowerCase();

// ---- password hashing (async scrypt) -------------------------------------------

const SCRYPT_PARAMS = { N: 32768, r: 8, p: 3 };
const SCRYPT_KEY_BYTES = 64;
const SCRYPT_SALT_BYTES = 16;
const LEGACY_KEY_BYTES = 64; // legacy "salt:hash" used Node's defaults (N=16384, r=8, p=1)

// scrypt needs about 128 * N * r bytes; leave headroom.
const maxmemFor = (N, r) => 128 * N * r * 2;

const scryptAsync = (password, salt, keylen, options) =>
  new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (error, key) => (error ? reject(error) : resolve(key)));
  });

/** "scrypt$N$r$p$<salt base64>$<hash base64>" */
export const hashPassword = async (password) => {
  const { N, r, p } = SCRYPT_PARAMS;
  const salt = randomBytes(SCRYPT_SALT_BYTES);
  const key = await scryptAsync(String(password), salt, SCRYPT_KEY_BYTES, {
    N,
    r,
    p,
    maxmem: maxmemFor(N, r),
  });
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${key.toString("base64")}`;
};

const isPowerOfTwo = (value) => Number.isInteger(value) && value > 1 && (value & (value - 1)) === 0;

/**
 * Resolves to { ok, needsRehash }. Supports the current format and the legacy
 * "salt:hash" format (hex, Node's scrypt defaults).
 */
export const verifyPassword = async (password, stored = "") => {
  const text = typeof stored === "string" ? stored : "";
  try {
    if (text.startsWith("scrypt$")) {
      const [, n, rr, pp, saltText, hashText] = text.split("$");
      const N = Number(n);
      const r = Number(rr);
      const p = Number(pp);
      const salt = Buffer.from(saltText || "", "base64");
      const expected = Buffer.from(hashText || "", "base64");
      if (
        !isPowerOfTwo(N) || N > 2 ** 20 ||
        !Number.isInteger(r) || r < 1 || r > 32 ||
        !Number.isInteger(p) || p < 1 || p > 16 ||
        salt.length < 8 || expected.length < 16 || expected.length > 128
      ) {
        return { ok: false, needsRehash: false };
      }
      const candidate = await scryptAsync(String(password), salt, expected.length, {
        N,
        r,
        p,
        maxmem: maxmemFor(N, r),
      });
      const ok = timingSafeEqual(candidate, expected);
      const current =
        N === SCRYPT_PARAMS.N && r === SCRYPT_PARAMS.r && p === SCRYPT_PARAMS.p;
      return { ok, needsRehash: ok && !current };
    }

    const [salt, hash] = text.split(":");
    if (!salt || !hash) return { ok: false, needsRehash: false };
    const candidate = await scryptAsync(String(password), salt, LEGACY_KEY_BYTES, {});
    const original = Buffer.from(hash, "hex");
    const ok = original.length === candidate.length && timingSafeEqual(original, candidate);
    return { ok, needsRehash: ok };
  } catch {
    return { ok: false, needsRehash: false };
  }
};

// Unknown accounts are checked against this so they cost the same scrypt work.
let dummyHash = null;
const getDummyHash = () => {
  dummyHash ||= hashPassword(randomBytes(16).toString("hex"));
  return dummyHash;
};

// ---- session tokens -----------------------------------------------------------

const signPayload = (payload, key) => createHmac("sha256", key).update(payload).digest("hex");

export const createAdminToken = (admin, { sid, iat = Date.now(), exp = iat + TOKEN_TTL_MS }) => {
  const key = getSigningKey();
  if (!key) throw new Error("Signing key unavailable");
  const payload = Buffer.from(
    JSON.stringify({
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
      sid,
      iat,
      exp,
    })
  ).toString("base64url");
  return `${payload}.${signPayload(payload, key)}`;
};

// ---- sessions ---------------------------------------------------------------

const createSession = async (admin, { ip, userAgent }) => {
  const createdAt = Date.now();
  const session = {
    id: randomBytes(32).toString("base64url"),
    adminId: admin.id,
    createdAt: new Date(createdAt).toISOString(),
    expiresAt: new Date(createdAt + TOKEN_TTL_MS).toISOString(),
    lastSeenAt: new Date(createdAt).toISOString(),
    revokedAt: null,
    ip: ip || null,
    userAgent: typeof userAgent === "string" ? userAgent.slice(0, 256) : null,
  };
  await insertRecord("sessions", session);
  return { session, iat: createdAt };
};

let lastSessionCleanupAt = 0;
const cleanupExpiredSessions = () => {
  const now = Date.now();
  if (now - lastSessionCleanupAt < SESSION_TOUCH_INTERVAL_MS) return;
  lastSessionCleanupAt = now;
  track(
    deleteRecordsBefore("sessions", "expiresAt", new Date(now).toISOString()).catch((error) =>
      console.warn("Failed to clean up expired admin sessions:", error?.message)
    )
  );
};

export const revokeSession = async (sid) =>
  updateRecords("sessions", { id: sid, revokedAt: null }, { revokedAt: new Date().toISOString() });

export const revokeAdminSessions = async (adminId) =>
  updateRecords("sessions", { adminId, revokedAt: null }, { revokedAt: new Date().toISOString() });

export const verifyAdminToken = async (token = "") => {
  try {
    const key = getSigningKey();
    if (!key || typeof token !== "string") return null;
    const [payload, signature] = token.split(".");
    if (!payload || !signature || !safeEqual(signPayload(payload, key), signature)) return null;

    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!Number.isFinite(decoded.exp) || decoded.exp < Date.now()) return null;
    if (typeof decoded.sid !== "string" || !decoded.sid) return null;
    if (typeof decoded.adminId !== "string" || !decoded.adminId) return null;

    const admin = await findCollectionItem("admins", { id: decoded.adminId });
    if (!admin || admin.isActive === false) return null;

    // Tokens issued before the last password change are revoked.
    const passwordChangedAt = new Date(admin.passwordChangedAt || 0).getTime();
    if (passwordChangedAt && !(Number(decoded.iat) >= passwordChangedAt)) return null;

    // The server-side session must exist, belong to this admin, and be live
    // (not revoked, not expired, not idle for more than 2 hours).
    const session = await findRecord("sessions", { id: decoded.sid });
    const now = Date.now();
    const lastSeenAt = new Date(session?.lastSeenAt || 0).getTime();
    if (
      !session ||
      session.adminId !== admin.id ||
      session.revokedAt ||
      !(new Date(session.expiresAt).getTime() > now) ||
      !(now - lastSeenAt <= SESSION_IDLE_MS)
    ) {
      return null;
    }

    if (now - lastSeenAt >= SESSION_TOUCH_INTERVAL_MS) {
      track(
        updateRecords("sessions", { id: session.id }, { lastSeenAt: new Date(now).toISOString() }).catch(
          (error) => console.warn("Failed to update admin session lastSeenAt:", error?.message)
        )
      );
    }

    return { admin, session };
  } catch (error) {
    // A store outage must surface (503), not look like a bad token.
    if (error?.statusCode === 503) throw error;
    return null;
  }
};

// ---- login limits (A4) ------------------------------------------------------

const pairKey = (email, prefix) => `login-pair:${email}|${prefix}`;
const pairLockKey = (email, prefix) => `login-pair-lock:${email}|${prefix}`;
const emailKey = (email) => `login-email:${email}`;
const emailLockKey = (email) => `login-email-lock:${email}`;

const lockedFor = async (lockKey) => {
  const lock = await getCounter(lockKey);
  return lock ? Math.max(lock.resetAt - Date.now(), 1) : 0;
};

// Atomic increment; over `limit` sets a 15-minute lock. Resolves to the lock ms or 0.
const countAttempt = async (counterKey, lockKey, limit) => {
  const existingLock = await lockedFor(lockKey);
  if (existingLock) return existingLock;
  const { count } = await hitCounter(counterKey, LOGIN_LIMITS.windowMs);
  if (count > limit) {
    await setCounter(lockKey, count, Date.now() + LOGIN_LIMITS.lockMs);
    return LOGIN_LIMITS.lockMs;
  }
  return 0;
};

/**
 * Steps 3 and 4 of the login order: the (email, IP prefix) counter, then the
 * global per-email counter. Resolves to the remaining lock in ms, or 0.
 */
export const countLoginAttempt = async (email, prefix) =>
  (await countAttempt(pairKey(email, prefix), pairLockKey(email, prefix), LOGIN_LIMITS.pairAttempts)) ||
  countAttempt(emailKey(email), emailLockKey(email), LOGIN_LIMITS.emailAttempts);

export const clearLoginCounters = async (email, prefix) => {
  await Promise.all([
    deleteCounter(pairKey(email, prefix)),
    deleteCounter(pairLockKey(email, prefix)),
    deleteCounter(emailKey(email)),
    deleteCounter(emailLockKey(email)),
  ]);
};

// After a password reset every lock for the email is lifted.
export const clearAllLoginCounters = async (email) => {
  await Promise.all([
    deleteCountersByPrefix(`login-pair:${email}|`),
    deleteCountersByPrefix(`login-pair-lock:${email}|`),
    deleteCounter(emailKey(email)),
    deleteCounter(emailLockKey(email)),
  ]);
};

/** True while failed sign-ins from this IP prefix should still be audited (5 per 15 min). */
export const shouldAuditLoginFailure = async (prefix) => {
  const { count } = await hitCounter(`login-audit:${prefix}`, LOGIN_LIMITS.windowMs);
  return count <= LOGIN_LIMITS.failureAuditsPerIp;
};

// ---- seeding ------------------------------------------------------------------

export const seedSuperAdmin = async () => {
  const email = normalizeEmail(process.env.SUPERADMIN_EMAIL || process.env.ADMIN_USERNAME);
  const password = process.env.SUPERADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn("SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD are required to seed admin login.");
    return null;
  }

  const existing = await findCollectionItem("admins", { email });
  if (existing) return existing;

  if (
    passwordPolicyError(password, email) ||
    String(password).trim().toLowerCase().startsWith("replace-with")
  ) {
    console.warn(
      "SUPERADMIN_PASSWORD does not meet the password policy (12-128 characters, must not contain the email name, no placeholder); super admin not seeded."
    );
    return null;
  }

  const admin = await createCollectionItem("admins", {
    name: process.env.SUPERADMIN_NAME || "Super Admin",
    email,
    passwordHash: await hashPassword(password),
    role: "super_admin",
    isActive: true,
    passwordChangedAt: new Date().toISOString(),
  });

  console.log("Super admin seeded.");
  return admin;
};

// ---- login ------------------------------------------------------------------

/** Step 5: verifies the password (dummy work for unknown/inactive accounts). */
export const verifyAdminCredentials = async (email, password) => {
  const admin = await findCollectionItem("admins", { email });
  const usable = admin && admin.isActive !== false && typeof admin.passwordHash === "string";
  const { ok, needsRehash } = await verifyPassword(
    password,
    usable ? admin.passwordHash : await getDummyHash()
  );
  return usable && ok ? { admin, needsRehash } : null;
};

/** Step 6: creates the session and token; rehashes legacy password hashes. */
export const completeAdminLogin = async ({ admin, needsRehash }, { password, ip, userAgent }) => {
  const { session, iat } = await createSession(admin, { ip, userAgent });
  const token = createAdminToken(admin, {
    sid: session.id,
    iat,
    exp: new Date(session.expiresAt).getTime(),
  });
  await updateCollectionItem("admins", admin.id, { lastLoginAt: new Date().toISOString() });
  if (needsRehash) {
    // Transparent upgrade; only if the stored hash did not change meanwhile.
    track(
      hashPassword(password)
        .then((passwordHash) =>
          updateCollectionItemIf(
            "admins",
            { id: admin.id, passwordHash: admin.passwordHash },
            { passwordHash }
          )
        )
        .catch((error) => console.warn("Password rehash failed:", error?.name, error?.message))
    );
  }
  cleanupExpiredSessions();

  return {
    token,
    admin: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
  };
};

// ---- password reset -----------------------------------------------------------

export const hashResetToken = (token) => createHash("sha256").update(String(token)).digest("hex");
const RESET_HASH = /^[0-9a-f]{64}$/;

const isLiveReset = (reset, now) =>
  !reset.usedAt &&
  new Date(reset.expiresAt).getTime() > now &&
  typeof reset.tokenHash === "string" &&
  RESET_HASH.test(reset.tokenHash);

export const createPasswordReset = async (username) => {
  const email = normalizeEmail(username);
  const admin = await findCollectionItem("admins", { email });
  if (!admin || admin.isActive === false) return null;

  // Opportunistic cleanup: used, expired and old-format records go; at most
  // MAX_ACTIVE_RESETS unused tokens are kept (including the new one).
  const now = Date.now();
  const resets = await findCollectionItems("passwordResets", { email });
  const live = resets
    .filter((reset) => isLiveReset(reset, now))
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const excess = live.slice(0, Math.max(live.length - (MAX_ACTIVE_RESETS - 1), 0));
  const removable = [...resets.filter((reset) => !isLiveReset(reset, now)), ...excess];
  await deleteCollectionItemsByIds(
    "passwordResets",
    removable.map((reset) => reset.id)
  );

  const resetToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(now + RESET_TTL_MS).toISOString();
  await createCollectionItem("passwordResets", {
    adminId: admin.id,
    email,
    tokenHash: hashResetToken(resetToken),
    expiresAt,
    usedAt: null,
  });

  return {
    adminId: admin.id,
    name: admin.name,
    email: admin.email || email,
    resetToken,
    expiresAt,
  };
};

export const resetAdminPassword = async ({ username, token, password }) => {
  const email = normalizeEmail(username);
  const admin = await findCollectionItem("admins", { email });
  const tokenHash = hashResetToken(token);
  const now = Date.now();
  const resets = await findCollectionItems("passwordResets", { email });
  let match = null;
  for (const reset of resets) {
    if (isLiveReset(reset, now) && safeEqual(reset.tokenHash, tokenHash)) match = reset;
  }
  if (!admin || admin.isActive === false || !match) return false;

  const passwordHash = await hashPassword(password);
  // Compare-and-set: exactly one concurrent request consumes the token, and
  // only that request changes the password.
  const consumed = await updateCollectionItemIf(
    "passwordResets",
    { id: match.id, usedAt: null },
    { usedAt: new Date().toISOString() }
  );
  if (!consumed) return false;

  await updateCollectionItem("admins", admin.id, {
    passwordHash,
    passwordChangedAt: new Date().toISOString(),
  });
  await revokeAdminSessions(admin.id);

  return admin;
};
