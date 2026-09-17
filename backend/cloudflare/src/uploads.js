// Image uploads (docs/agents/UPLOADS_V1.md) for the Worker, at parity with
// backend/controllers/uploads.js. Files live in the R2 bucket bound as IMAGES; records in the
// D1 `records` table (collection `uploads`) and the running total in system/uploads-usage.
// Rules: backend/shared/uploads.js.
//
// Storage usage, the cap and the alert are developer-only: nothing here reaches an admin
// response, notification or audit summary beyond the neutral 507 message.
import { ApiError, created, describeError, json, ok, readBodyBytes } from "./http.js";
import { changesOf, createCollectionItem, getById, listCollection, now } from "./store.js";
import { enforceRateLimit } from "./auth.js";
import { hasCapability, FORBIDDEN_MESSAGE } from "../../shared/capabilities.js";
import { SETTINGS_ID, mergeSettings } from "../../shared/settings.js";
import {
  REFERENCE_COLLECTIONS,
  SYSTEM_COLLECTION,
  UPLOADS_COLLECTION,
  UPLOAD_CACHE_CONTROL,
  UPLOAD_CAPABILITIES,
  UPLOAD_MAX_BYTES,
  UPLOAD_MESSAGES,
  USAGE_ID,
  canUploadPurpose,
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
  uploadsUnavailable,
  uploadUrl,
} from "../../shared/uploads.js";

export const UPLOAD_PATH = "/admin/uploads";
const CONFIG_PATH = "/admin/uploads/config";
const PUBLIC_PREFIX = "/uploads/";

// ---- usage record (system/uploads-usage) -----------------------------------------------------

const ensureUsage = async (env) => {
  const timestamp = now();
  const data = { totalBytes: 0, lastAlertAt: null, isActive: true, createdAt: timestamp, updatedAt: timestamp, id: USAGE_ID };
  await env.DB.prepare(
    `INSERT INTO records (id, collection, slug, data, is_active, sort_order, created_at, updated_at)
      VALUES (?, ?, NULL, ?, 1, 0, ?, ?) ON CONFLICT (id) DO NOTHING`
  )
    .bind(USAGE_ID, SYSTEM_COLLECTION, JSON.stringify(data), timestamp, timestamp)
    .run();
};

export const getUsage = async (env) => (await getById(env, SYSTEM_COLLECTION, USAGE_ID)) || { totalBytes: 0, lastAlertAt: null };

// Adds `delta` bytes (never below 0). With `limit`, only when the new total stays within it;
// with `whileUploadId`, only while that upload record exists.
const adjustUsageStatement = (env, delta, limit = null, whileUploadId = null) => {
  const timestamp = now();
  const total = "COALESCE(json_extract(data, '$.totalBytes'), 0)";
  const conditions = [];
  const values = [delta, timestamp];
  if (limit !== null) {
    values.push(limit);
    conditions.push(`${total} + ?1 <= ?${values.length}`);
  }
  if (whileUploadId !== null) {
    values.push(whileUploadId);
    conditions.push(`EXISTS (SELECT 1 FROM records WHERE collection = '${UPLOADS_COLLECTION}' AND id = ?${values.length})`);
  }
  return env.DB.prepare(
    `UPDATE records SET data = json_set(data, '$.totalBytes', MAX(${total} + ?1, 0), '$.updatedAt', ?2), updated_at = ?2
      WHERE collection = '${SYSTEM_COLLECTION}' AND id = '${USAGE_ID}'${conditions.map((condition) => ` AND ${condition}`).join("")}`
  ).bind(...values);
};

/** Reserves `size` bytes under the cap. Resolves to false when the cap would be passed. */
const reserveBytes = async (env, size, limit) => {
  await ensureUsage(env);
  return changesOf(await adjustUsageStatement(env, size, limit).run()) === 1;
};

const releaseBytes = (env, size) =>
  adjustUsageStatement(env, -size)
    .run()
    .catch((error) => console.error("Releasing reserved upload bytes failed:", describeError(error)));

/** Recomputes totalBytes from the upload records (daily). Resolves to the total. */
export const reconcileUsage = async (env) => {
  await ensureUsage(env);
  const timestamp = now();
  await env.DB.prepare(
    `UPDATE records SET data = json_set(data, '$.totalBytes',
        (SELECT COALESCE(SUM(json_extract(data, '$.size')), 0) FROM records WHERE collection = '${UPLOADS_COLLECTION}'),
        '$.updatedAt', ?1), updated_at = ?1
      WHERE collection = '${SYSTEM_COLLECTION}' AND id = '${USAGE_ID}'`
  )
    .bind(timestamp)
    .run();
  return Number((await getUsage(env)).totalBytes) || 0;
};

// ---- private developer alert ------------------------------------------------------------------

// Claims the 7-day alert slot atomically: only one run records lastAlertAt.
const claimAlert = async (env, nowMs) => {
  const cutoff = new Date(nowMs - 7 * 24 * 60 * 60 * 1000).toISOString();
  const timestamp = new Date(nowMs).toISOString();
  const result = await env.DB.prepare(
    `UPDATE records SET data = json_set(data, '$.lastAlertAt', ?1), updated_at = ?1
      WHERE collection = '${SYSTEM_COLLECTION}' AND id = '${USAGE_ID}'
        AND (json_extract(data, '$.lastAlertAt') IS NULL OR json_extract(data, '$.lastAlertAt') <= ?2)`
  )
    .bind(timestamp, cutoff)
    .run();
  return changesOf(result) === 1;
};

const adminAddresses = async (env) => {
  const [admins, settingsRecord] = await Promise.all([
    listCollection(env, "admins", { includeInactive: true }),
    getById(env, "settings", SETTINGS_ID),
  ]);
  const { notifications } = mergeSettings(settingsRecord);
  return [
    env.ADMIN_NOTIFY_EMAIL,
    ...admins.map((admin) => admin.email),
    ...notifications.orderEmails,
    ...notifications.lowStockEmails,
    ...notifications.vacancyEmails,
  ];
};

/**
 * Emails STORAGE_ALERT_EMAIL (never an admin) when usage is at or above STORAGE_ALERT_BYTES,
 * or when an upload was refused at the cap, at most once every 7 days. Resolves to true when sent.
 */
export const maybeSendStorageAlert = async (env, sendNotification, { refused = false } = {}) => {
  if (!env.STORAGE_ALERT_EMAIL) return false;
  await ensureUsage(env);
  const usage = await getUsage(env);
  const totalBytes = Number(usage.totalBytes) || 0;
  const alertBytes = storageAlertBytes(env);
  const nowMs = Date.now();
  if ((!refused && totalBytes < alertBytes) || !alertAllowed(usage, nowMs)) return false;
  const to = alertRecipients(env.STORAGE_ALERT_EMAIL, await adminAddresses(env));
  if (!to.length) {
    console.warn("Storage alert skipped: STORAGE_ALERT_EMAIL has no address outside the admin accounts.");
    return false;
  }
  if (!(await claimAlert(env, nowMs))) return false;
  const email = storageAlertEmail({ totalBytes, alertBytes, limitBytes: storageLimitBytes(env), refused });
  const result = await sendNotification({ to, ...email });
  const sent = !result?.skipped && !result?.failed;
  console.log(`Storage alert ${sent ? "sent" : "not delivered"} (${totalBytes} bytes).`);
  return sent;
};

// ---- routes -------------------------------------------------------------------------------------

const requireUploadCapability = (admin) => {
  if (!UPLOAD_CAPABILITIES.some((capability) => hasCapability(admin, capability))) throw new ApiError(403, FORBIDDEN_MESSAGE);
};

const actorOf = (admin) => (admin ? { id: admin.id, email: admin.email } : null);

/** POST /admin/uploads: raw image bytes. Called before the JSON body is read. */
export const handleUploadCreate = async ({ request, env, ctx, admin, url, audit, sendNotification }) => {
  requireUploadCapability(admin);
  const purpose = uploadPurpose(url.searchParams.get("purpose") ?? undefined);
  if (!canUploadPurpose((capability) => hasCapability(admin, capability), purpose)) throw new ApiError(403, FORBIDDEN_MESSAGE);
  const contentType = uploadContentType(request.headers.get("Content-Type"));
  assertDeclaredLength(request.headers.get("Content-Length"));
  if (!env.IMAGES) throw uploadsUnavailable();
  await enforceRateLimit(env, ctx, "upload", admin.id);

  let bytes;
  try {
    bytes = await readBodyBytes(request, UPLOAD_MAX_BYTES);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 413) throw tooLarge();
    throw error;
  }
  assertImageBytes(bytes, contentType);
  const size = bytes.byteLength;

  if (!(await reserveBytes(env, size, storageLimitBytes(env)))) {
    console.warn(`Upload refused at the storage cap (${size} bytes).`);
    ctx?.waitUntil?.(
      maybeSendStorageAlert(env, sendNotification, { refused: true }).catch((error) =>
        console.error("Storage alert failed:", describeError(error))
      )
    );
    throw uploadsUnavailable();
  }

  const id = crypto.randomUUID();
  const createdAt = now();
  const key = uploadKey(purpose, contentType, crypto.randomUUID(), new Date(createdAt));
  try {
    await env.IMAGES.put(key, bytes, { httpMetadata: { contentType, cacheControl: UPLOAD_CACHE_CONTROL } });
  } catch (error) {
    await releaseBytes(env, size);
    console.error("Storing the uploaded image failed:", describeError(error));
    throw new ApiError(503, UPLOAD_MESSAGES.unavailable);
  }

  let record;
  try {
    record = await createCollectionItem(
      env,
      UPLOADS_COLLECTION,
      uploadRecord({
        id,
        key,
        url: uploadUrl(env.IMAGES_PUBLIC_BASE_URL, url.origin, key),
        contentType,
        size,
        purpose,
        actor: actorOf(admin),
        createdAt,
      }),
      { id }
    );
  } catch (error) {
    await Promise.all([env.IMAGES.delete(key).catch(() => {}), releaseBytes(env, size)]);
    throw error;
  }
  audit(uploadAuditEntry(record));
  return created(UPLOAD_MESSAGES.created, serializeUpload(record));
};

/** GET /admin/uploads/config: any signed-in admin. */
export const handleUploadsAdmin = async ({ request, env, path }) => {
  if (request.method === "GET" && path === CONFIG_PATH) return ok(UPLOAD_MESSAGES.config, uploadConfig({ enabled: Boolean(env.IMAGES) }));
  return null;
};

export const isPublicUploadPath = (method, path) => (method === "GET" || method === "HEAD") && typeof path === "string" && path.startsWith(PUBLIC_PREFIX);

/** GET /uploads/:key from R2, with immutable caching and the stored content type. */
export const handleUploadGet = async (env, path) => {
  const key = path.slice(PUBLIC_PREFIX.length);
  const notFound = () => json({ success: false, message: UPLOAD_MESSAGES.notFound }, 404);
  if (!isUploadKey(key) || !env.IMAGES) return notFound();
  const object = await env.IMAGES.get(key);
  if (!object) return notFound();
  const stored = object.httpMetadata?.contentType;
  const contentType = stored && contentTypeForKey(key) === stored ? stored : contentTypeForKey(key);
  const headers = {
    "Content-Type": contentType,
    "Cache-Control": UPLOAD_CACHE_CONTROL,
    "X-Content-Type-Options": "nosniff",
  };
  if (Number.isFinite(object.size)) headers["Content-Length"] = String(object.size);
  if (object.httpEtag) headers.ETag = object.httpEtag;
  return new Response(object.body, { status: 200, headers });
};

// ---- daily maintenance (cron) ----------------------------------------------------------------

/** Deletes unreferenced uploads older than 24 hours (at most 500): object, record and usage. */
export const sweepUploads = async (env) => {
  if (!env.IMAGES) return { deleted: 0 };
  const [uploads, ...lists] = await Promise.all([
    listCollection(env, UPLOADS_COLLECTION, { includeInactive: true }),
    ...REFERENCE_COLLECTIONS.map((collection) => listCollection(env, collection, { includeInactive: true })),
  ]);
  const texts = referenceTexts(Object.fromEntries(REFERENCE_COLLECTIONS.map((collection, index) => [collection, lists[index]])));
  const candidates = sweepCandidates(uploads, texts);
  if (!candidates.length) return { deleted: 0 };
  await env.IMAGES.delete(candidates.map((upload) => upload.key));
  await ensureUsage(env);
  let deleted = 0;
  for (const upload of candidates) {
    // One transaction: the total drops only while the record still exists (another run may
    // have removed it), then the record goes.
    const results = await env.DB.batch([
      adjustUsageStatement(env, -(Number(upload.size) || 0), null, upload.id),
      env.DB.prepare(`DELETE FROM records WHERE collection = '${UPLOADS_COLLECTION}' AND id = ?`).bind(upload.id),
    ]);
    if (changesOf(results[1]) === 1) deleted += 1;
  }
  return { deleted };
};

/** Cron: sweep, reconcile the total, then the private alert. */
export const runUploadsMaintenance = async (env, sendNotification) => {
  const { deleted } = await sweepUploads(env);
  const totalBytes = await reconcileUsage(env);
  const alerted = await maybeSendStorageAlert(env, sendNotification);
  console.log(`Upload sweep: ${deleted} unreferenced image(s) deleted.`);
  return { deleted, totalBytes, alerted };
};
