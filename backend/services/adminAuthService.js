import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";
import config from "../config.js";
import {
  createCollectionItem,
  findCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
  updateCollectionItemByQuery,
} from "./store.js";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 12;
const RESET_TTL_MS = 1000 * 60 * 30;

const getSecret = () =>
  process.env.ADMIN_AUTH_SECRET || process.env.ADMIN_TOKEN || "juwon-electric-admin-secret";

const normalizeEmail = (email = "") => email.trim().toLowerCase();

export const hashPassword = (password) => {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

export const verifyPassword = (password, stored = "") => {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const original = Buffer.from(hash, "hex");
  return original.length === candidate.length && timingSafeEqual(original, candidate);
};

const signPayload = (payload) =>
  createHmac("sha256", getSecret()).update(payload).digest("hex");

export const createAdminToken = (admin) => {
  const payload = Buffer.from(
    JSON.stringify({
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
      exp: Date.now() + TOKEN_TTL_MS,
    })
  ).toString("base64url");
  return `${payload}.${signPayload(payload)}`;
};

export const verifyAdminToken = async (token = "") => {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature || signPayload(payload) !== signature) return null;

    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (decoded.exp < Date.now()) return null;

    const admin = await getCollectionItem("admins", decoded.adminId);
    if (!admin || admin.isActive === false) return null;
    return admin;
  } catch {
    return null;
  }
};

export const seedSuperAdmin = async () => {
  const email = normalizeEmail(process.env.SUPERADMIN_EMAIL || process.env.ADMIN_USERNAME);
  const password = process.env.SUPERADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn("SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD are required to seed admin login.");
    return null;
  }

  const existing = await findCollectionItem("admins", { email });
  if (existing) return existing;

  const admin = await createCollectionItem("admins", {
    name: process.env.SUPERADMIN_NAME || "Super Admin",
    email,
    passwordHash: hashPassword(password),
    role: "super_admin",
    isActive: true,
    passwordChangedAt: new Date().toISOString(),
  });

  console.log(`Super admin seeded for ${email}.`);
  return admin;
};

export const loginAdmin = async ({ username, password }) => {
  const email = normalizeEmail(username);
  const admin = await findCollectionItem("admins", { email });

  if (!admin || admin.isActive === false || !verifyPassword(password, admin.passwordHash)) {
    return null;
  }

  const token = createAdminToken(admin);
  await updateCollectionItem("admins", admin.id, {
    lastLoginAt: new Date().toISOString(),
  });

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

export const createPasswordReset = async (username) => {
  const email = normalizeEmail(username);
  const admin = await findCollectionItem("admins", { email });
  if (!admin || admin.isActive === false) return null;

  const resetToken = randomBytes(32).toString("hex");
  await createCollectionItem("passwordResets", {
    adminId: admin.id,
    email,
    tokenHash: hashPassword(resetToken),
    expiresAt: new Date(Date.now() + RESET_TTL_MS).toISOString(),
    usedAt: null,
  });

  return {
    email,
    resetToken,
    expiresAt: new Date(Date.now() + RESET_TTL_MS).toISOString(),
  };
};

export const resetAdminPassword = async ({ username, token, password }) => {
  const email = normalizeEmail(username);
  const resets = await listCollection("passwordResets", { includeInactive: true });
  const reset = resets
    .filter((item) => item.email === email)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  const admin = await findCollectionItem("admins", { email });

  if (
    !reset ||
    !admin ||
    reset.usedAt ||
    new Date(reset.expiresAt).getTime() < Date.now() ||
    !verifyPassword(token, reset.tokenHash)
  ) {
    return false;
  }

  await updateCollectionItem("admins", admin.id, {
    passwordHash: hashPassword(password),
    passwordChangedAt: new Date().toISOString(),
  });
  await updateCollectionItemByQuery("passwordResets", { id: reset.id }, {
    usedAt: new Date().toISOString(),
  });

  return true;
};
