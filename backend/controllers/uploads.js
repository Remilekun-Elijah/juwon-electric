// Image uploads (docs/agents/UPLOADS_V1.md) for Express, at parity with the Worker
// (backend/cloudflare/src/uploads.js). Files live on the local disk under backend/data/uploads/
// (UPLOADS_DIR overrides it), records in the `uploads` collection and the running total in
// system/uploads-usage. Rules: backend/shared/uploads.js.
//
// Storage usage, the cap and the alert are developer-only: nothing here reaches an admin
// response, notification or audit summary beyond the neutral 507 message.
import { randomUUID } from "crypto";
import { createReadStream } from "fs";
import { mkdir, rename, stat, unlink, writeFile } from "fs/promises";
import { dirname, join, resolve, sep } from "path";
import { fileURLToPath } from "url";
import config from "../config.js";
import { sendMail } from "../mail/mail.js";
import { LIMITS, enforceLimit } from "../middleware/rateLimit.js";
import { asyncHandler } from "../services/asyncHandler.js";
import { STATIC_TOKEN_ACTOR, audit } from "../services/audit.js";
import { ApiError } from "../services/errors.js";
import { runInBackground } from "../services/runtime.js";
import { created, ok } from "../services/http.js";
import { getSettings } from "../services/settings.js";
import {
  claimStorageAlert,
  createCollectionItem,
  deleteUploadRecord,
  getUploadUsage,
  listCollection,
  reconcileUploadUsage,
  releaseUploadBytes,
  reserveUploadBytes,
} from "../services/store.js";
import { FORBIDDEN_MESSAGE, STATIC_ADMIN, hasCapability } from "../shared/capabilities.js";
import {
  ALERT_INTERVAL_MS,
  REFERENCE_COLLECTIONS,
  UPLOADS_COLLECTION,
  UPLOAD_CACHE_CONTROL,
  UPLOAD_CAPABILITIES,
  UPLOAD_MAX_BYTES,
  UPLOAD_MESSAGES,
  alertAllowed,
  alertRecipients,
  assertDeclaredLength,
  assertImageBytes,
  contentTypeForKey,
  isUploadKey,
  referenceTexts,
  serializeUpload,
  storageAlertBytes,
  storageAlertEmail,
  storageLimitBytes,
  sweepCandidates,
  tooLarge,
  uploadAuditEntry,
  uploadConfig,
  uploadContentType,
  uploadKey,
  uploadPurpose,
  uploadRecord,
  uploadUrl,
} from "../shared/uploads.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Upload directory: UPLOADS_DIR, or backend/data/uploads (gitignored). */
export const uploadsDir = () =>
  process.env.UPLOADS_DIR ? resolve(process.env.UPLOADS_DIR) : resolve(__dirname, "../data/uploads");

// Only keys matching the fixed shape reach the disk, and the resolved path must stay inside the directory.
const filePathFor = (key) => {
  if (!isUploadKey(key)) return null;
  const root = uploadsDir();
  const target = resolve(join(root, key));
  return target.startsWith(`${root}${sep}`) ? target : null;
};

const actingAdmin = (req) => (req.adminStaticToken ? STATIC_ADMIN : req.admin);
const actorOf = (req) =>
  req.admin ? { id: req.admin.id, email: req.admin.email } : { id: STATIC_TOKEN_ACTOR, email: STATIC_TOKEN_ACTOR };

/** Reads the request body, rejecting (413) as soon as more than `maxBytes` arrive. */
const readCappedBody = (req, maxBytes) =>
  new Promise((resolveBody, reject) => {
    const chunks = [];
    let total = 0;
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      if (error) {
        // Keep draining so the connection can answer; the bytes are discarded.
        req.resume();
        reject(error);
      } else resolveBody(value);
    };
    req.on("data", (chunk) => {
      if (settled) return;
      total += chunk.length;
      if (total > maxBytes) return finish(tooLarge());
      chunks.push(chunk);
    });
    req.on("end", () => finish(null, Buffer.concat(chunks)));
    req.on("error", (error) => finish(error));
  });

const writeFileAtomic = async (path, bytes) => {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${randomUUID()}.tmp`;
  await writeFile(temp, bytes);
  await rename(temp, path);
};

// ---- private developer alert --------------------------------------------------------------------

const adminAddresses = async () => {
  const [admins, settings] = await Promise.all([listCollection("admins", { includeInactive: true }), getSettings()]);
  return [
    process.env.ADMIN_NOTIFY_EMAIL,
    // sendMail's default recipient is the SMTP_FROM mailbox, an admin inbox.
    config.smtp_from,
    ...admins.map((admin) => admin.email),
    ...settings.notifications.orderEmails,
    ...settings.notifications.lowStockEmails,
    ...settings.notifications.vacancyEmails,
  ];
};

/**
 * Emails STORAGE_ALERT_EMAIL (never an admin, never MAIL_BCC) when usage is at or above
 * STORAGE_ALERT_BYTES, or when an upload was refused at the cap, at most once every 7 days.
 * Resolves to true when sent.
 */
export const maybeSendStorageAlert = async ({ refused = false } = {}) => {
  const env = process.env;
  if (!env.STORAGE_ALERT_EMAIL) return false;
  const usage = await getUploadUsage();
  const totalBytes = Number(usage.totalBytes) || 0;
  const alertBytes = storageAlertBytes(env);
  const nowMs = Date.now();
  if ((!refused && totalBytes < alertBytes) || !alertAllowed(usage, nowMs)) return false;
  const to = alertRecipients(env.STORAGE_ALERT_EMAIL, await adminAddresses());
  if (!to.length) {
    console.warn("Storage alert skipped: STORAGE_ALERT_EMAIL has no address outside the admin accounts.");
    return false;
  }
  if (!(await claimStorageAlert(new Date(nowMs).toISOString(), new Date(nowMs - ALERT_INTERVAL_MS).toISOString()))) return false;
  const { subject, text, html } = storageAlertEmail({ totalBytes, alertBytes, limitBytes: storageLimitBytes(env), refused });
  const sent = await sendMail({ to, subject, text, data: html, bcc: false }, (body) => body);
  console.log(`Storage alert ${sent ? "sent" : "not delivered"} (${totalBytes} bytes).`);
  return sent;
};

// ---- routes ----------------------------------------------------------------------------------------

/** Router guard: any one of the upload capabilities (403 otherwise). */
export const canUpload = (req, _res, next) => {
  const admin = actingAdmin(req);
  if (!admin) return next(new ApiError(401, "Admin authorization is required."));
  if (!UPLOAD_CAPABILITIES.some((capability) => hasCapability(admin, capability))) {
    return next(new ApiError(403, FORBIDDEN_MESSAGE));
  }
  return next();
};

export const adminUploadConfig = (_req, res) => ok(res, UPLOAD_MESSAGES.config, uploadConfig());

export const adminUploadImage = asyncHandler(async (req, res) => {
  const purpose = uploadPurpose(req.query.purpose);
  const contentType = uploadContentType(req.get("content-type"));
  assertDeclaredLength(req.get("content-length"));
  const actor = actorOf(req);
  await enforceLimit(req, res, "upload", LIMITS.upload, actor.id);

  const bytes = await readCappedBody(req, UPLOAD_MAX_BYTES);
  assertImageBytes(bytes, contentType);
  const size = bytes.length;

  if (!(await reserveUploadBytes(size, storageLimitBytes(process.env)))) {
    console.warn(`Upload refused at the storage cap (${size} bytes).`);
    runInBackground("Storage alert", () => maybeSendStorageAlert({ refused: true }));
    // ApiError: the Express error handler exposes its message although the status is 5xx.
    throw new ApiError(507, UPLOAD_MESSAGES.unavailable);
  }

  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const key = uploadKey(purpose, contentType, randomUUID(), new Date(createdAt));
  const path = filePathFor(key);
  try {
    await writeFileAtomic(path, bytes);
  } catch (error) {
    await releaseUploadBytes(size).catch(() => {});
    console.error("Storing the uploaded image failed:", error?.code || error?.message);
    throw new ApiError(503, UPLOAD_MESSAGES.unavailable);
  }

  let record;
  try {
    const origin = `${req.protocol}://${req.get("host")}`;
    record = await createCollectionItem(
      UPLOADS_COLLECTION,
      uploadRecord({ id, key, url: uploadUrl(process.env.IMAGES_PUBLIC_BASE_URL, origin, key), contentType, size, purpose, actor, createdAt })
    );
  } catch (error) {
    await Promise.all([unlink(path).catch(() => {}), releaseUploadBytes(size).catch(() => {})]);
    throw error;
  }
  audit(req, uploadAuditEntry(record));
  created(res, UPLOAD_MESSAGES.created, serializeUpload(record));
});

/** GET /uploads/<key>: the stored file with immutable caching. */
export const getUploadedImage = asyncHandler(async (req, res) => {
  const key = req.params[0];
  const path = filePathFor(key);
  const notFound = () => res.status(404).json({ success: false, message: UPLOAD_MESSAGES.notFound });
  if (!path) return notFound();
  let info;
  try {
    info = await stat(path);
  } catch {
    return notFound();
  }
  if (!info.isFile()) return notFound();
  res.set({
    "Content-Type": contentTypeForKey(key),
    "Content-Length": String(info.size),
    "Cache-Control": UPLOAD_CACHE_CONTROL,
    "X-Content-Type-Options": "nosniff",
    // Embedded by the storefront, which can be on another site.
    "Cross-Origin-Resource-Policy": "cross-origin",
  });
  if (req.method === "HEAD") return res.status(200).end();
  await new Promise((resolveStream, reject) => {
    const stream = createReadStream(path);
    stream.on("error", reject);
    res.on("close", resolveStream);
    stream.pipe(res);
  });
});

// ---- daily maintenance (Express timer) ----------------------------------------------------------

/** Deletes unreferenced uploads older than 24 hours (at most 500): file, record and usage. */
export const sweepUploads = async () => {
  const [uploads, ...lists] = await Promise.all([
    listCollection(UPLOADS_COLLECTION, { includeInactive: true }),
    ...REFERENCE_COLLECTIONS.map((collection) => listCollection(collection, { includeInactive: true })),
  ]);
  const texts = referenceTexts(Object.fromEntries(REFERENCE_COLLECTIONS.map((collection, index) => [collection, lists[index]])));
  let deleted = 0;
  for (const upload of sweepCandidates(uploads, texts)) {
    const path = filePathFor(upload.key);
    if (path) await unlink(path).catch((error) => (error?.code === "ENOENT" ? null : Promise.reject(error)));
    if (await deleteUploadRecord(upload.id)) deleted += 1;
  }
  return { deleted };
};

/** Daily: sweep, reconcile the total, then the private alert. */
export const runUploadsMaintenance = async () => {
  const { deleted } = await sweepUploads();
  const totalBytes = await reconcileUploadUsage();
  const alerted = await maybeSendStorageAlert();
  console.log(`Upload sweep: ${deleted} unreferenced image(s) deleted.`);
  return { deleted, totalBytes, alerted };
};
