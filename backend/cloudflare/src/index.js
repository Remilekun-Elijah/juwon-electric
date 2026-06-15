import {
  contactNotificationTemplate,
  contactReplyTemplate,
  orderNotificationTemplate,
  subscriberNotificationTemplate,
} from "./emailTemplates.js";

const COLLECTIONS = [
  "packages",
  "newsletters",
  "services",
  "customerSegments",
  "portfolio",
  "contacts",
  "carts",
  "orders",
  "admins",
  "passwordResets",
];

const ORDER_STATUSES = ["pending", "completed", "cancelled"];
const TOKEN_TTL_MS = 1000 * 60 * 60 * 12;
const RESET_TTL_MS = 1000 * 60 * 30;
const PBKDF2_ITERATIONS = 100000;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization,x-admin-token,x-webhook-secret",
    },
  });

const ok = (message, data) => json({ success: true, message, data });
const created = (message, data) => json({ success: true, message, data }, 201);

class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

const badRequest = (message) => {
  throw new ApiError(400, message);
};

const notFound = (message = "Route not found.") => {
  throw new ApiError(404, message);
};

const now = () => new Date().toISOString();

const normalizeSlug = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const optionalString = (body, key) => {
  const value = body?.[key];
  return typeof value === "string" ? value.trim() : value ?? "";
};

const requiredString = (body, key, label = key) => {
  const value = optionalString(body, key);
  if (!value) badRequest(`${label} is required.`);
  return value;
};

const optionalNumber = (body, key) => {
  const value = body?.[key];
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  if (Number.isNaN(number)) badRequest(`${key} must be a number.`);
  return number;
};

const requiredNumber = (body, key, label = key) => {
  const value = optionalNumber(body, key);
  if (value === undefined) badRequest(`${label} is required.`);
  return value;
};

const optionalBoolean = (body, key, fallback = false) => {
  if (body?.[key] === undefined || body?.[key] === null) return fallback;
  return body[key] === true || body[key] === "true";
};

const validateEmail = (value, required = false) => {
  const email = String(value || "").trim().toLowerCase();
  if (!email && !required) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    badRequest("A valid email address is required.");
  }
  return email;
};

const parseJson = async (request) => {
  if (!["POST", "PUT", "PATCH"].includes(request.method)) return {};
  try {
    return await request.json();
  } catch {
    return {};
  }
};

const toRecord = (row) => (row ? JSON.parse(row.data) : null);

const withMeta = (item, index = 0) => {
  const id = String(item.id || crypto.randomUUID());
  const timestamp = now();
  return {
    slug: item.slug || normalizeSlug(item.name || item.title || `${Date.now()}-${index}`),
    isActive: item.isActive ?? true,
    sortOrder: item.sortOrder ?? index + 1,
    createdAt: item.createdAt || timestamp,
    updatedAt: item.updatedAt || timestamp,
    ...item,
    id,
  };
};

const assertCollection = (collection) => {
  if (!COLLECTIONS.includes(collection)) badRequest("Unknown collection.");
};

const saveRecord = async (env, collection, item) => {
  assertCollection(collection);
  const data = JSON.stringify(item);
  await env.DB.prepare(
    `INSERT OR REPLACE INTO records
      (id, collection, slug, data, is_active, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      item.id,
      collection,
      item.slug || null,
      data,
      item.isActive === false ? 0 : 1,
      Number(item.sortOrder || 0),
      item.createdAt || now(),
      item.updatedAt || now()
    )
    .run();
  return item;
};

const listCollection = async (env, collection, options = {}) => {
  assertCollection(collection);
  const includeInactive = options.includeInactive === true;
  const query = includeInactive
    ? "SELECT data FROM records WHERE collection = ? ORDER BY sort_order ASC, created_at ASC"
    : "SELECT data FROM records WHERE collection = ? AND is_active != 0 ORDER BY sort_order ASC, created_at ASC";
  const result = await env.DB.prepare(query).bind(collection).all();
  return (result.results || []).map(toRecord);
};

const getCollectionItem = async (env, collection, id) => {
  assertCollection(collection);
  const stringId = String(id);
  const result = await env.DB.prepare(
    "SELECT data FROM records WHERE collection = ? AND (id = ? OR slug = ?)"
  )
    .bind(collection, stringId, stringId)
    .first();
  if (result) return toRecord(result);

  const items = await listCollection(env, collection, { includeInactive: true });
  const item = items.find((entry) => String(entry.legacyId) === stringId);
  if (!item) notFound(`${collection} record not found.`);
  return item;
};

const findCollectionItem = async (env, collection, query) => {
  const items = await listCollection(env, collection, { includeInactive: true });
  return items.find((item) =>
    Object.entries(query).every(([key, value]) => item[key] === value)
  );
};

const createCollectionItem = async (env, collection, payload) => {
  const items = await listCollection(env, collection, { includeInactive: true });
  const item = withMeta(payload, items.length);
  return saveRecord(env, collection, item);
};

const updateCollectionItem = async (env, collection, id, payload) => {
  const existing = await getCollectionItem(env, collection, id);
  const item = {
    ...existing,
    ...payload,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: now(),
  };
  return saveRecord(env, collection, item);
};

const deleteCollectionItem = async (env, collection, id) => {
  const existing = await getCollectionItem(env, collection, id);
  await env.DB.prepare("DELETE FROM records WHERE id = ? AND collection = ?")
    .bind(existing.id, collection)
    .run();
  return existing;
};

const appendCollectionItem = (env, collection, payload) =>
  createCollectionItem(env, collection, {
    ...payload,
    status: payload.status || "new",
    receivedAt: now(),
  });

const validateOptions = (options) => {
  if (!Array.isArray(options) || options.length === 0) {
    badRequest("Package options are required.");
  }

  return options.map((option) => ({
    name: requiredString(option, "name", "Option name"),
    price: requiredNumber(option, "price", "Option price"),
    kits: option.kits || "",
  }));
};

const packagePayload = (body, existing = {}) => {
  const type = requiredString(body, "type").toLowerCase();
  const name = requiredString(body, "name");
  return {
    legacyId: body.legacyId ?? existing.legacyId,
    type,
    category: body.category || type,
    name,
    slug: body.slug || existing.slug || normalizeSlug(`${name}-${type}-${body.kva || existing.kva}`),
    load: requiredString(body, "load"),
    kva: requiredNumber(body, "kva"),
    volt: optionalNumber(body, "volt"),
    options: validateOptions(body.options),
    isActive: optionalBoolean(body, "isActive", existing.isActive ?? true),
    sortOrder: optionalNumber(body, "sortOrder") ?? existing.sortOrder,
  };
};

const serializePackage = (item) => ({
  id: item.legacyId ?? item.id,
  _id: item.id,
  slug: item.slug,
  type: item.type,
  category: item.category || item.type,
  name: item.name,
  load: item.load,
  kva: item.kva,
  volt: item.volt,
  options: item.options,
});

const contentPayload = (body, existing = {}, kind) => {
  const nameKey = kind === "portfolio" ? "name" : "title";
  const name = requiredString(body, nameKey, kind === "portfolio" ? "Name" : "Title");
  return {
    [nameKey]: name,
    slug: body.slug || existing.slug || normalizeSlug(name),
    image: requiredString(body, "image", "Image"),
    ...(kind === "portfolio"
      ? {
          link: optionalString(body, "link") || existing.link || "",
          featured: optionalBoolean(body, "featured", existing.featured ?? false),
          mobile: optionalBoolean(body, "mobile", existing.mobile ?? true),
        }
      : {
          subtitle: requiredString(body, "subtitle", "Subtitle"),
          ctaLabel: optionalString(body, "ctaLabel") || existing.ctaLabel || "Let's go",
          ctaUrl: optionalString(body, "ctaUrl") || existing.ctaUrl || "/packages",
        }),
    isActive: optionalBoolean(body, "isActive", existing.isActive ?? true),
    sortOrder: optionalNumber(body, "sortOrder") ?? existing.sortOrder,
  };
};

const segmentPayload = (body, existing = {}) => {
  const title = requiredString(body, "title", "Title");
  return {
    title,
    slug: body.slug || existing.slug || normalizeSlug(title),
    subtitle: requiredString(body, "subtitle", "Subtitle"),
    image: requiredString(body, "image", "Image"),
    isActive: optionalBoolean(body, "isActive", existing.isActive ?? true),
    sortOrder: optionalNumber(body, "sortOrder") ?? existing.sortOrder,
  };
};

const parseMoney = (value) => {
  if (typeof value === "number") return value;
  if (!value) return 0;
  return Number(String(value).replace(/[^\d.-]/g, "")) || 0;
};

const getOrderRevenue = (order) => {
  const total = parseMoney(order?.total);
  if (total) return total;
  return (order?.order || []).reduce(
    (sum, item) => sum + parseMoney(item.price) * Number(item.quantity || 1),
    0
  );
};

const normalizeOrderStatus = (status) =>
  ["completed", "cancelled"].includes(status) ? status : "pending";

const getRevenueSeries = (orders) => {
  const buckets = orders.reduce((series, order) => {
    const date = new Date(order.receivedAt || order.createdAt || Date.now());
    const key = date.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
    return { ...series, [key]: (series[key] || 0) + getOrderRevenue(order) };
  }, {});
  return Object.entries(buckets)
    .slice(-6)
    .map(([label, value]) => ({ label, value }));
};

const normalizeOrderItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    badRequest("At least one order item is required.");
  }
  return items.map((item) => ({
    package: requiredString(item, "package", "Package"),
    type: optionalString(item, "type"),
    kva: optionalString(item, "kva"),
    price: item.price,
    quantity: Number(item.quantity || 1),
  }));
};

const quoteItems = async (env, items) => {
  if (!Array.isArray(items) || items.length === 0) badRequest("Cart items are required.");
  const packages = await listCollection(env, "packages", { includeInactive: true });
  return items.map((item) => {
    const pack = packages.find(
      (entry) =>
        entry.id === item.packageId ||
        entry.slug === item.packageId ||
        String(entry.legacyId) === String(item.id)
    );
    if (!pack) badRequest(`Package ${item.packageId || item.id} was not found.`);
    const withSolar = String(item.withSolar) === "true" || item.optionName === "With solar";
    const option =
      pack.options.find((entry) =>
        withSolar ? entry.name === "With solar" : entry.name === "Without solar"
      ) || pack.options[0];
    const quantity = Math.max(Number(item.quantity || 1), 1);
    const lineTotal = option.price * quantity;
    return {
      packageId: pack.id,
      legacyId: pack.legacyId,
      name: pack.name,
      type: pack.type,
      kva: pack.kva,
      volt: pack.volt,
      optionName: option.name,
      kits: option.kits,
      price: option.price,
      quantity,
      lineTotal,
    };
  });
};

const textEncoder = new TextEncoder();

const bytesToHex = (bytes) =>
  [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

const randomHex = (length = 32) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
};

const base64urlEncode = (value) =>
  btoa(typeof value === "string" ? value : JSON.stringify(value))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

const base64urlDecode = (value) => {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return atob(padded);
};

const digestHex = async (value) =>
  bytesToHex(await crypto.subtle.digest("SHA-256", textEncoder.encode(value)));

const hmacHex = async (secret, payload) => {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return bytesToHex(await crypto.subtle.sign("HMAC", key, textEncoder.encode(payload)));
};

const hashPassword = async (password, salt = randomHex(16), rounds = PBKDF2_ITERATIONS) => {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: textEncoder.encode(salt), iterations: rounds, hash: "SHA-256" },
    key,
    256
  );
  return `pbkdf2:${rounds}:${salt}:${bytesToHex(hash)}`;
};

const verifyPassword = async (password, stored = "") => {
  const [scheme, rounds, salt, hash] = stored.split(":");
  if (scheme !== "pbkdf2" || !rounds || !salt || !hash) return false;
  return (await hashPassword(password, salt, Number(rounds))) === stored;
};

const getSecret = (env) =>
  env.ADMIN_AUTH_SECRET || env.ADMIN_TOKEN || "juwon-electric-admin-secret";

const createAdminToken = async (env, admin) => {
  const payload = base64urlEncode({
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
    exp: Date.now() + TOKEN_TTL_MS,
  });
  return `${payload}.${await hmacHex(getSecret(env), payload)}`;
};

const verifyAdminToken = async (env, token = "") => {
  const [payload, signature] = token.split(".");
  if (!payload || !signature || (await hmacHex(getSecret(env), payload)) !== signature) return null;
  const decoded = JSON.parse(base64urlDecode(payload));
  if (decoded.exp < Date.now()) return null;
  const admin = await getCollectionItem(env, "admins", decoded.adminId).catch(() => null);
  if (!admin || admin.isActive === false) return null;
  return admin;
};

const seedSuperAdmin = async (env) => {
  const email = validateEmail(env.SUPERADMIN_EMAIL || env.ADMIN_USERNAME, true);
  const password = env.SUPERADMIN_PASSWORD || env.ADMIN_PASSWORD;
  if (!email || !password) return null;

  const existing = await findCollectionItem(env, "admins", { email });
  if (existing) return existing;

  return createCollectionItem(env, "admins", {
    name: env.SUPERADMIN_NAME || "Super Admin",
    email,
    passwordHash: await hashPassword(password),
    role: "super_admin",
    isActive: true,
    passwordChangedAt: now(),
  });
};

const requireAdmin = async (request, env) => {
  const token =
    request.headers.get("x-admin-token") ||
    request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");

  if (env.ADMIN_TOKEN && token === env.ADMIN_TOKEN) {
    return { id: "static-admin", email: "static-admin", role: "super_admin" };
  }

  const admin = await verifyAdminToken(env, token || "");
  if (!admin) throw new ApiError(401, "Admin authorization is required.");
  return admin;
};

const sendNotification = async (env, { to, subject, text, html }) => {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM || !to) return { skipped: true };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to,
      subject,
      text,
      html,
      reply_to: env.MAIL_REPLY_TO || env.MAIL_FROM,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    console.error("Email provider failed", details);
  }

  return { skipped: false };
};

const routeRoot = () =>
  ok("Juwon Electric API", {
    modules: ["packages", "newsletter", "services", "portfolio", "contact", "cart", "orders"],
    runtime: "cloudflare-workers",
  });

const handlePublic = async (request, env, path, body, url) => {
  if (request.method === "GET" && path === "/packages") {
    const packages = await listCollection(env, "packages");
    return ok("Packages retrieved.", packages.map(serializePackage));
  }

  if (request.method === "GET" && path.startsWith("/packages/")) {
    const item = await getCollectionItem(env, "packages", path.split("/").pop());
    return ok("Package retrieved.", serializePackage(item));
  }

  if (request.method === "GET" && path === "/services") {
    const [offerings, customerSegments] = await Promise.all([
      listCollection(env, "services"),
      listCollection(env, "customerSegments"),
    ]);
    return ok("Services retrieved.", { offerings, customerSegments });
  }

  if (request.method === "GET" && path === "/portfolio") {
    const items = await listCollection(env, "portfolio");
    const data = url.searchParams.get("featured") === "true"
      ? items.filter((item) => item.featured)
      : items;
    return ok("Portfolio retrieved.", data);
  }

  if (request.method === "GET" && path.startsWith("/portfolio/")) {
    const item = await getCollectionItem(env, "portfolio", path.split("/").pop());
    return ok("Portfolio item retrieved.", item);
  }

  if (request.method === "POST" && path === "/cart/quote") {
    const items = await quoteItems(env, body.items || body.cart);
    return ok("Cart quoted.", { items, total: items.reduce((sum, item) => sum + item.lineTotal, 0) });
  }

  if (request.method === "POST" && path === "/cart") {
    const items = await quoteItems(env, body.items || body.cart);
    const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const cart = await appendCollectionItem(env, "carts", {
      name: optionalString(body, "name"),
      phoneNumber: optionalString(body, "phoneNumber"),
      emailAddress: optionalString(body, "emailAddress"),
      sessionId: requiredString(body, "sessionId", "Session id"),
      items,
      total,
      status: "open",
    });
    return created("Cart saved.", cart);
  }

  if (request.method === "POST" && path === "/contact") {
    const message = await appendCollectionItem(env, "contacts", {
      name: requiredString(body, "name", "Name"),
      phoneNumber: requiredString(body, "phoneNumber", "Phone number"),
      emailAddress: validateEmail(optionalString(body, "emailAddress")),
      message: requiredString(body, "message", "Message"),
      source: optionalString(body, "source") || "client",
    });
    await sendNotification(env, {
      to: env.ADMIN_NOTIFY_EMAIL,
      subject: "You have a message",
      text: `${message.name}\n${message.phoneNumber}\n${message.emailAddress}\n\n${message.message}`,
      html: contactNotificationTemplate(message),
    });
    return created("Message sent.", message);
  }

  if (request.method === "POST" && path === "/subscribe") {
    const subscriber = await appendCollectionItem(env, "newsletters", {
      emailAddress: validateEmail(body.emailAddress || body.email, true),
      name: optionalString(body, "name"),
      source: optionalString(body, "source") || "client",
    });
    await sendNotification(env, {
      to: env.ADMIN_NOTIFY_EMAIL,
      subject: "You have a new subscriber",
      text: subscriber.emailAddress,
      html: subscriberNotificationTemplate(subscriber),
    });
    return created(
      "Thank you for subscribing to our newsletter. We will keep you up to date when we add a new product.",
      subscriber
    );
  }

  if (request.method === "POST" && path === "/order") {
    const order = await appendCollectionItem(env, "orders", {
      name: requiredString(body, "name", "Name"),
      phoneNumber: requiredString(body, "phoneNumber", "Phone number"),
      emailAddress: validateEmail(optionalString(body, "emailAddress")),
      deliveryAddress: requiredString(body, "deliveryAddress", "Delivery address"),
      order: normalizeOrderItems(body.order),
      total: body.total,
      status: "pending",
      paymentStatus: "unpaid",
      source: optionalString(body, "source") || "client",
    });
    await sendNotification(env, {
      to: env.ADMIN_NOTIFY_EMAIL,
      subject: "You have a new order",
      text: `${order.name}\n${order.phoneNumber}\n${order.deliveryAddress}\nTotal: ${order.total}`,
      html: orderNotificationTemplate(order),
    });
    return created("Order placed successfully.", order);
  }

  if (request.method === "POST" && path === "/webhooks/contact-reply") {
    if (env.INBOUND_EMAIL_WEBHOOK_SECRET && request.headers.get("x-webhook-secret") !== env.INBOUND_EMAIL_WEBHOOK_SECRET) {
      badRequest("Invalid webhook secret.");
    }

    const subject = optionalString(body, "subject");
    const fromEmail = validateEmail(
      optionalString(body, "fromEmail") || optionalString(body, "from") || optionalString(body, "sender"),
      true
    );
    const message = optionalString(body, "text") || optionalString(body, "body") || optionalString(body, "message");
    if (!message) badRequest("Inbound message body is required.");

    const subjectMatch = subject.match(/\[JE-CONTACT:([^\]]+)\]/i);
    const contact = subjectMatch
      ? await getCollectionItem(env, "contacts", subjectMatch[1])
      : await findCollectionItem(env, "contacts", { emailAddress: fromEmail });
    if (!contact) badRequest("Unable to match inbound email to a contact.");

    const updated = await updateCollectionItem(env, "contacts", contact.id, {
      status: "contacted",
      inboundReplies: [
        ...(contact.inboundReplies || []),
        { fromEmail, subject, message, receivedAt: now() },
      ],
      lastInboundReplyAt: now(),
    });
    return ok("Inbound reply recorded.", updated);
  }

  return null;
};

const handleAdminAuth = async (request, env, path, body) => {
  if (request.method === "POST" && path === "/admin/auth/login") {
    await seedSuperAdmin(env);
    const email = validateEmail(requiredString(body, "username", "Username"), true);
    const admin = await findCollectionItem(env, "admins", { email });
    if (!admin || admin.isActive === false || !(await verifyPassword(requiredString(body, "password", "Password"), admin.passwordHash))) {
      throw new ApiError(401, "Invalid username or password.");
    }
    await updateCollectionItem(env, "admins", admin.id, { lastLoginAt: now() });
    return ok("Login successful.", {
      token: await createAdminToken(env, admin),
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    });
  }

  if (request.method === "POST" && path === "/admin/auth/request-password-reset") {
    await seedSuperAdmin(env);
    const email = validateEmail(requiredString(body, "username", "Username"), true);
    const admin = await findCollectionItem(env, "admins", { email });
    if (!admin || admin.isActive === false) {
      return ok("If the account exists, a reset token has been generated.");
    }
    const resetToken = randomHex(32);
    const reset = await createCollectionItem(env, "passwordResets", {
      adminId: admin.id,
      email,
      tokenHash: await hashPassword(resetToken),
      expiresAt: new Date(Date.now() + RESET_TTL_MS).toISOString(),
      usedAt: null,
    });
    return created("Password reset token generated.", {
      email,
      expiresAt: reset.expiresAt,
      ...(env.NODE_ENV === "production" ? {} : { resetToken }),
    });
  }

  if (request.method === "POST" && path === "/admin/auth/reset-password") {
    const password = requiredString(body, "password", "New password");
    if (password.length < 8) badRequest("Password must be at least 8 characters.");
    const email = validateEmail(requiredString(body, "username", "Username"), true);
    const admin = await findCollectionItem(env, "admins", { email });
    const resets = (await listCollection(env, "passwordResets", { includeInactive: true }))
      .filter((item) => item.email === email)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const reset = resets[0];
    if (
      !admin ||
      !reset ||
      reset.usedAt ||
      new Date(reset.expiresAt).getTime() < Date.now() ||
      !(await verifyPassword(requiredString(body, "token", "Reset token"), reset.tokenHash))
    ) {
      throw new ApiError(400, "Invalid or expired reset token.");
    }
    await updateCollectionItem(env, "admins", admin.id, {
      passwordHash: await hashPassword(password),
      passwordChangedAt: now(),
    });
    await updateCollectionItem(env, "passwordResets", reset.id, { usedAt: now() });
    return ok("Password reset successful.");
  }

  return null;
};

const handleAdmin = async (request, env, path, body, admin) => {
  if (request.method === "GET" && path === "/admin/dashboard") {
    const [orders, contacts, newsletter] = await Promise.all([
      listCollection(env, "orders", { includeInactive: true }),
      listCollection(env, "contacts", { includeInactive: true }),
      listCollection(env, "newsletters", { includeInactive: true }),
    ]);
    const statusCounts = orders.reduce((counts, order) => {
      const status = normalizeOrderStatus(order.status);
      return { ...counts, [status]: (counts[status] || 0) + 1 };
    }, {});
    const totalRevenue = orders.reduce((sum, order) => sum + getOrderRevenue(order), 0);
    const recentOrders = [...orders]
      .sort((a, b) => new Date(b.receivedAt || b.createdAt || 0) - new Date(a.receivedAt || a.createdAt || 0))
      .slice(0, 5)
      .map((order) => ({
        id: order.id,
        name: order.name,
        phoneNumber: order.phoneNumber,
        deliveryAddress: order.deliveryAddress,
        status: normalizeOrderStatus(order.status),
        revenue: getOrderRevenue(order),
        receivedAt: order.receivedAt || order.createdAt,
      }));
    return ok("Dashboard retrieved.", {
      stats: {
        totalRevenue,
        orderCount: orders.length,
        pendingOrders: orders.filter((order) => normalizeOrderStatus(order.status) === "pending").length,
        completedOrders: orders.filter((order) => order.status === "completed").length,
        leadCount: contacts.length + newsletter.length,
        contactCount: contacts.length,
        subscriberCount: newsletter.length,
      },
      statusCounts,
      revenueSeries: getRevenueSeries(orders),
      recentOrders,
    });
  }

  if (request.method === "GET" && path === "/admin/packages") {
    return ok("Packages retrieved.", await listCollection(env, "packages", { includeInactive: true }));
  }
  if (request.method === "POST" && path === "/admin/packages") {
    return created("Package created.", await createCollectionItem(env, "packages", packagePayload(body)));
  }
  if (path.startsWith("/admin/packages/")) {
    const id = path.split("/").pop();
    if (request.method === "PUT") {
      const existing = await getCollectionItem(env, "packages", id);
      return ok("Package updated.", await updateCollectionItem(env, "packages", id, packagePayload(body, existing)));
    }
    if (request.method === "DELETE") {
      return ok("Package deleted.", await deleteCollectionItem(env, "packages", id));
    }
  }

  if (request.method === "GET" && path === "/admin/services") {
    const [offerings, customerSegments] = await Promise.all([
      listCollection(env, "services", { includeInactive: true }),
      listCollection(env, "customerSegments", { includeInactive: true }),
    ]);
    return ok("Services retrieved.", { offerings, customerSegments });
  }
  if (request.method === "POST" && path === "/admin/services") {
    return created("Service created.", await createCollectionItem(env, "services", contentPayload(body, {}, "services")));
  }
  if (path.startsWith("/admin/services/customer-segments/")) {
    const id = path.split("/").pop();
    if (request.method === "PUT") {
      const existing = await getCollectionItem(env, "customerSegments", id);
      return ok("Customer segment updated.", await updateCollectionItem(env, "customerSegments", id, segmentPayload(body, existing)));
    }
    if (request.method === "DELETE") {
      return ok("Customer segment deleted.", await deleteCollectionItem(env, "customerSegments", id));
    }
  }
  if (request.method === "POST" && path === "/admin/services/customer-segments") {
    return created("Customer segment created.", await createCollectionItem(env, "customerSegments", segmentPayload(body)));
  }
  if (path.startsWith("/admin/services/")) {
    const id = path.split("/").pop();
    if (request.method === "PUT") {
      const existing = await getCollectionItem(env, "services", id);
      return ok("Service updated.", await updateCollectionItem(env, "services", id, contentPayload(body, existing, "services")));
    }
    if (request.method === "DELETE") {
      return ok("Service deleted.", await deleteCollectionItem(env, "services", id));
    }
  }

  if (request.method === "GET" && path === "/admin/portfolio") {
    return ok("Portfolio retrieved.", await listCollection(env, "portfolio", { includeInactive: true }));
  }
  if (request.method === "POST" && path === "/admin/portfolio") {
    return created("Portfolio item created.", await createCollectionItem(env, "portfolio", contentPayload(body, {}, "portfolio")));
  }
  if (path.startsWith("/admin/portfolio/")) {
    const id = path.split("/").pop();
    if (request.method === "PUT") {
      const existing = await getCollectionItem(env, "portfolio", id);
      return ok("Portfolio item updated.", await updateCollectionItem(env, "portfolio", id, contentPayload(body, existing, "portfolio")));
    }
    if (request.method === "DELETE") {
      return ok("Portfolio item deleted.", await deleteCollectionItem(env, "portfolio", id));
    }
  }

  if (request.method === "GET" && path === "/admin/contacts") {
    return ok("Messages retrieved.", await listCollection(env, "contacts", { includeInactive: true }));
  }
  if (path.startsWith("/admin/contacts/") && path.endsWith("/reply") && request.method === "POST") {
    const id = path.split("/").at(-2);
    const contact = await getCollectionItem(env, "contacts", id);
    if (!contact.emailAddress) badRequest("This contact did not provide an email address.");
    const reply = requiredString(body, "message", "Reply message");
    const subject = (optionalString(body, "subject") || "Re: Your message to Juwon Electric").includes("[JE-CONTACT:")
      ? optionalString(body, "subject")
      : `${optionalString(body, "subject") || "Re: Your message to Juwon Electric"} [JE-CONTACT:${contact.id}]`;
    await sendNotification(env, {
      to: contact.emailAddress,
      subject,
      text: reply,
      html: contactReplyTemplate({
        name: contact.name,
        originalMessage: contact.message,
        reply,
      }),
    });
    const sentAt = now();
    const message = await updateCollectionItem(env, "contacts", id, {
      status: "contacted",
      replies: [...(contact.replies || []), { subject, message: reply, sentAt, sentBy: admin.email }],
      lastRepliedAt: sentAt,
    });
    return ok("Reply sent.", message);
  }
  if (path.startsWith("/admin/contacts/") && request.method === "PUT") {
    const id = path.split("/").pop();
    return ok("Message updated.", await updateCollectionItem(env, "contacts", id, {
      status: body.status || "new",
      note: optionalString(body, "note"),
      isActive: body.isActive ?? true,
    }));
  }

  if (request.method === "GET" && path === "/admin/newsletter") {
    return ok("Subscribers retrieved.", await listCollection(env, "newsletters", { includeInactive: true }));
  }
  if (path.startsWith("/admin/newsletter/") && request.method === "PUT") {
    const id = path.split("/").pop();
    return ok("Subscriber updated.", await updateCollectionItem(env, "newsletters", id, {
      status: body.status || "new",
      isActive: body.isActive ?? true,
    }));
  }

  if (request.method === "GET" && path === "/admin/carts") {
    return ok("Carts retrieved.", await listCollection(env, "carts", { includeInactive: true }));
  }

  if (request.method === "GET" && path === "/admin/orders") {
    return ok("Orders retrieved.", await listCollection(env, "orders", { includeInactive: true }));
  }
  if (path.startsWith("/admin/orders/")) {
    const id = path.split("/").pop();
    if (request.method === "GET") {
      return ok("Order retrieved.", await getCollectionItem(env, "orders", id));
    }
    if (request.method === "PUT") {
      const status = body.status || "pending";
      if (!ORDER_STATUSES.includes(status)) badRequest("Invalid order status.");
      return ok("Order updated.", await updateCollectionItem(env, "orders", id, {
        status,
        paymentStatus: body.paymentStatus || "unpaid",
        note: optionalString(body, "note"),
        isActive: body.isActive ?? true,
      }));
    }
  }

  return null;
};

const normalizePath = (url) => {
  let path = url.pathname;
  if (path.startsWith("/api/admin")) return path.replace("/api/admin", "/admin") || "/admin";
  if (path.startsWith("/api")) return path.replace("/api", "") || "/";
  return path;
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return json({ success: true });

    try {
      const url = new URL(request.url);
      const path = normalizePath(url);
      const body = await parseJson(request);

      if (request.method === "GET" && path === "/") return routeRoot();

      const authResponse = await handleAdminAuth(request, env, path, body);
      if (authResponse) return authResponse;

      if (path.startsWith("/admin")) {
        const admin = await requireAdmin(request, env);
        const response = await handleAdmin(request, env, path, body, admin);
        if (response) return response;
      }

      const publicResponse = await handlePublic(request, env, path, body, url);
      if (publicResponse) return publicResponse;

      return json({ success: false, message: "Route not found." }, 404);
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return json({
        success: false,
        message: error.message || "Something went wrong.",
        details: error.details,
      }, statusCode);
    }
  },
};
