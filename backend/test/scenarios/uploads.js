// Image uploads v1 (docs/agents/UPLOADS_V1.md §1-§4, §7, §8): config, capabilities, validation
// (type, spoofed signatures, SVG, size before and during the read), keys, records, the public
// GET with its headers and safe key check, the rate limit, the hidden storage cap (507), the
// daily sweep, the usage total and the private developer alert. Runtime-agnostic scenario;
// returns the transcript for parity. The client needs an IMAGES bucket (Worker: R2Stub).
import assert from "node:assert/strict";
import { ALERT_MAILBOX, STATIC_TOKEN, recorder } from "./opsKit.js";

const FORBIDDEN = "You do not have permission to perform this action.";
const TOO_LARGE = "Image must be 2 MB or smaller.";
const BAD_TYPE = "Upload a JPEG, PNG or WebP image.";
const UNAVAILABLE = "Image uploads are unavailable right now. Please use an image link or try again later.";
const TOO_MANY = "You’ve uploaded a lot of images in a short time. Wait a few minutes, then try again.";
export const DEVELOPER_MAILBOX = "developer@juwon.test";

/** Env for the scenario: the alert goes to the developer plus an admin mailbox that must be dropped. */
export const UPLOADS_ENV = { STORAGE_ALERT_EMAIL: `${DEVELOPER_MAILBOX}, ${ALERT_MAILBOX}` };

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const DAY_MS = 24 * 60 * 60 * 1000;

const bytesOf = (head, size, fill = 0x41) => {
  const bytes = Buffer.alloc(size, fill);
  Buffer.from(head).copy(bytes);
  return bytes;
};
export const png = (size = 120, seed = 1) => bytesOf([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], size, 0x40 + seed);
export const jpeg = (size = 150) => bytesOf([0xff, 0xd8, 0xff, 0xe0], size);
export const webp = (size = 90) => bytesOf([...Buffer.from("RIFF"), 0x52, 0, 0, 0, ...Buffer.from("WEBPVP8 ")], size);
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
const gif = bytesOf([...Buffer.from("GIF89a")], 64);

// Keys and URLs carry a uuid, the date and (without IMAGES_PUBLIC_BASE_URL) the origin.
const maskKey = (value) =>
  String(value)
    .replace(new RegExp(UUID, "g"), "<uuid>")
    .replace(/\/\d{4}\/\d{2}\//g, "/<yyyy>/<mm>/")
    .replace(/^https?:\/\/[^/]+/, "<origin>");
const maskUpload = (body) =>
  body?.data?.key ? { ...body, data: { ...body.data, key: maskKey(body.data.key), url: maskKey(body.data.url) } } : body;

// The cron also sends the low-stock digest; only storage alerts count here.
const storageAlerts = (client) => client.emails.filter((email) => email.subject.startsWith("Juwon Electric: image storage"));

const sum = (records) => records.reduce((total, record) => total + record.size, 0);

export const runUploadsScenario = async (client) => {
  const { transcript, expect } = recorder(client);
  const sales = await client.seedAdmin("sales"); // content:write
  const inventory = await client.seedAdmin("inventory"); // products:write
  const hr = await client.seedAdmin("hr"); // staff:write
  const support = await client.seedAdmin("support"); // none of them
  const engineer = await client.seedAdmin("engineer");
  const burst = await client.seedAdmin("admin");

  const upload = (label, { bytes, type, purpose, token = STATIC_TOKEN, headers = {} }, status, message) =>
    expect(
      label,
      "POST",
      `/admin/uploads${purpose === undefined ? "" : `?purpose=${purpose}`}`,
      { token, rawBody: bytes, headers: { ...(type ? { "content-type": type } : {}), ...headers }, project: maskUpload },
      status,
      message
    );

  // Public GET: status, the headers that matter and whether the bytes match.
  const fetchImage = async (label, path, expected, method = "GET") => {
    const response = await client.request(method, path, { raw: true });
    const step = {
      status: response.status,
      contentType: (response.headers["content-type"] || "").split(";")[0] || null,
      cacheControl: response.status === 200 ? response.headers["cache-control"] : null,
      nosniff: response.headers["x-content-type-options"] || null,
      corp: response.status === 200 ? response.headers["cross-origin-resource-policy"] : null,
      sameBytes: expected && method === "GET" ? Buffer.compare(response.bytes, expected) === 0 : null,
      message: response.body?.message ?? null,
    };
    transcript.push({ label, method, path, status: response.status, body: step });
    return { response, step };
  };

  // ---- config (§2): any signed-in admin, never usage or limits ------------------------------
  const config = (await expect("config for any admin", "GET", "/admin/uploads/config", { token: engineer.token }, 200, "Upload settings retrieved.")).body.data;
  assert.deepEqual(config, { enabled: true, maxBytes: 2_000_000, accept: ["image/jpeg", "image/png", "image/webp"], maxDimension: 1600 });
  await expect("config needs a session", "GET", "/admin/uploads/config", { token: null }, 401);

  // ---- capabilities --------------------------------------------------------------------------
  await upload("anonymous cannot upload", { bytes: png(), type: "image/png", token: null }, 401);
  await upload("support cannot upload", { bytes: png(), type: "image/png", token: support.token }, 403, FORBIDDEN);
  await upload("engineer cannot upload site images", { bytes: png(), type: "image/png", token: engineer.token }, 403, FORBIDDEN);
  await upload("engineer cannot upload for products", { bytes: png(), type: "image/png", purpose: "products", token: engineer.token }, 403, FORBIDDEN);
  await upload("engineer cannot upload staff photos", { bytes: png(), type: "image/png", purpose: "staff", token: engineer.token }, 403, FORBIDDEN);
  await upload("content:write uploads", { bytes: jpeg(), type: "image/jpeg", purpose: "services", token: sales.token }, 201, "Image uploaded.");
  await upload("products:write uploads", { bytes: webp(), type: "image/webp", purpose: "products", token: inventory.token }, 201);
  const byHr = (await upload("staff:write uploads", { bytes: png(), type: "image/png", purpose: "team", token: hr.token }, 201)).body.data;

  // Job photos: jobs:update-own (engineers) or jobs:assign. Staff photos: staff:write.
  const jobPhoto = (await upload("jobs:update-own uploads a job photo", { bytes: jpeg(), type: "image/jpeg", purpose: "jobs", token: engineer.token }, 201, "Image uploaded.")).body.data;
  assert.match(jobPhoto.key, /^jobs\//);
  await upload("jobs:assign uploads a job photo", { bytes: webp(), type: "image/webp", purpose: "jobs", token: sales.token }, 201);
  await upload("products:write cannot upload job photos", { bytes: png(), type: "image/png", purpose: "jobs", token: inventory.token }, 403, FORBIDDEN);
  await upload("staff:write cannot upload job photos", { bytes: png(), type: "image/png", purpose: "jobs", token: hr.token }, 403, FORBIDDEN);
  await upload("support cannot upload job photos", { bytes: png(), type: "image/png", purpose: "jobs", token: support.token }, 403, FORBIDDEN);
  const staffPhoto = (await upload("staff:write uploads a staff photo", { bytes: png(), type: "image/png", purpose: "staff", token: hr.token }, 201)).body.data;
  assert.match(staffPhoto.key, /^staff\//);
  await upload("content:write cannot upload staff photos", { bytes: png(), type: "image/png", purpose: "staff", token: sales.token }, 403, FORBIDDEN);
  await upload("products:write cannot upload staff photos", { bytes: png(), type: "image/png", purpose: "staff", token: inventory.token }, 403, FORBIDDEN);

  // ---- upload OK: shape, key, record, audit ------------------------------------------------------
  const logo = png(321, 2);
  const first = (await upload("upload a product image", { bytes: logo, type: "image/png; charset=binary", purpose: "products" }, 201, "Image uploaded.")).body.data;
  assert.deepEqual(Object.keys(first).sort(), ["contentType", "id", "key", "size", "url"]);
  const now = new Date();
  const yearMonth = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  assert.match(first.key, new RegExp(`^products/${yearMonth}/${UUID}\\.png$`));
  assert.ok(first.url.endsWith(`/uploads/${first.key}`), first.url);
  assert.equal(first.size, logo.length);
  assert.equal(first.contentType, "image/png");

  const record = await client.getRecord("uploads", first.id);
  assert.deepEqual(
    { key: record.key, url: record.url, contentType: record.contentType, size: record.size, purpose: record.purpose, uploadedBy: record.uploadedBy },
    { key: first.key, url: first.url, contentType: "image/png", size: logo.length, purpose: "products", uploadedBy: { id: "static-token", email: "static-token" } }
  );
  assert.ok(record.createdAt);
  assert.deepEqual((await client.getRecord("uploads", byHr.id)).uploadedBy, { id: hr.id, email: hr.email });
  assert.equal(await client.hasStoredImage(first.key), true);

  const other = (await upload("purpose defaults to other", { bytes: jpeg(200), type: "image/jpeg" }, 201)).body.data;
  assert.match(other.key, new RegExp(`^other/${yearMonth}/${UUID}\\.jpg$`));
  await upload("unknown purpose", { bytes: png(), type: "image/png", purpose: "avatars" }, 400,
    "Purpose must be one of: products, categories, packages, services, portfolio, segments, reviews, clients, team, jobs, staff, other.");
  const viaApi = (
    await expect("the /api prefix works too", "POST", "/api/admin/uploads?purpose=reviews", {
      rawBody: webp(), headers: { "content-type": "image/webp" }, project: maskUpload,
    }, 201)
  ).body.data;
  assert.match(viaApi.key, new RegExp(`^reviews/${yearMonth}/${UUID}\\.webp$`));

  const audits = (
    await expect("upload is audited", "GET", "/admin/audit-logs?action=upload.create", {
      project: (body) => ({ total: body.data.total, entries: body.data.items.map((item) => `${item.entity} ${maskKey(item.summary)}`).sort() }),
    }, 200)
  ).body.data;
  assert.equal(audits.total, 9);
  const audited = audits.items.find((item) => item.entityId === first.id);
  assert.deepEqual({ entity: audited.entity, summary: audited.summary }, { entity: "upload", summary: `Uploaded image ${first.key}` });

  // ---- public GET (§1) --------------------------------------------------------------------------
  const { step } = await fetchImage("public image", `/uploads/${first.key}`, logo);
  assert.deepEqual(step, {
    status: 200,
    contentType: "image/png",
    cacheControl: "public, max-age=31536000, immutable",
    nosniff: "nosniff",
    corp: "cross-origin",
    sameBytes: true,
    message: null,
  });
  assert.equal((await fetchImage("public image via /api", `/api/uploads/${first.key}`, logo)).step.sameBytes, true);
  assert.equal((await fetchImage("HEAD public image", `/uploads/${first.key}`, null, "HEAD")).step.contentType, "image/png");
  assert.equal((await fetchImage("jpeg content type", `/uploads/${other.key}`, null)).step.contentType, "image/jpeg");

  const missing = first.key.replace(/[0-9a-f]{12}\.png$/, "000000000000.png");
  const notFound = { status: 404, message: "Image not found." };
  for (const [label, path] of [
    ["unknown key", `/uploads/${missing}`],
    ["encoded traversal", "/uploads/products/2026/09/..%2F..%2F..%2Fdb.json"],
    ["encoded traversal to the store", `/uploads/..%2Fdb.json`],
    ["upper-case extension", `/uploads/${first.key.replace(/png$/, "PNG")}`],
    ["svg extension", `/uploads/${first.key.replace(/png$/, "svg")}`],
    ["unknown prefix", `/uploads/${first.key.replace(/^products/, "secrets")}`],
    ["no key", "/uploads/"],
  ]) {
    const result = (await fetchImage(label, path, null)).step;
    assert.deepEqual({ status: result.status, message: result.message }, notFound, label);
  }

  // ---- type validation (§2): declared type, signatures, SVG --------------------------------------
  await upload("gif is rejected", { bytes: gif, type: "image/gif" }, 415, BAD_TYPE);
  await upload("svg is rejected", { bytes: svg, type: "image/svg+xml" }, 415, BAD_TYPE);
  await upload("json is rejected", { bytes: Buffer.from('{"image":"x"}'), type: "application/json" }, 415, BAD_TYPE);
  await upload("missing content type", { bytes: png() }, 415, BAD_TYPE);
  await upload("png bytes declared as jpeg", { bytes: png(), type: "image/jpeg" }, 415, BAD_TYPE);
  await upload("svg bytes declared as png", { bytes: svg, type: "image/png" }, 415, BAD_TYPE);
  await upload("jpeg bytes declared as webp", { bytes: jpeg(), type: "image/webp" }, 415, BAD_TYPE);
  await upload("riff without webp", { bytes: bytesOf([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WAVE")], 40), type: "image/webp" }, 415, BAD_TYPE);

  // ---- size (§2): 1 byte to 2 MB, Content-Length first, the read capped --------------------------
  await upload("declared over 2 MB", { bytes: png(2_000_001), type: "image/png" }, 413, TOO_LARGE);
  await upload("empty body", { bytes: Buffer.alloc(0), type: "image/png" }, 413, TOO_LARGE);
  const chunked = () => {
    let sent = 0;
    return new ReadableStream({
      pull(controller) {
        if (sent >= 3) return controller.close();
        controller.enqueue(sent === 0 ? png(1_000_000) : new Uint8Array(1_000_000));
        sent += 1;
      },
    });
  };
  await upload("streamed past 2 MB without Content-Length", { bytes: chunked(), type: "image/png" }, 413, TOO_LARGE);
  const exact = (await upload("exactly 2 MB", { bytes: png(2_000_000), type: "image/png", purpose: "portfolio" }, 201)).body.data;
  assert.equal(exact.size, 2_000_000);
  const records = await client.listRecords("uploads");
  assert.equal(records.length, 10, "rejected uploads store nothing");

  // ---- usage total ----------------------------------------------------------------------------------
  let usage = await client.getRecord("system", "uploads-usage");
  assert.equal(usage.totalBytes, sum(records), "running total matches the records");

  // ---- rate limit: 60 per admin per 10 minutes --------------------------------------------------------
  for (let index = 0; index < 60; index += 1) {
    const response = await client.request("POST", "/admin/uploads?purpose=other", {
      token: burst.token,
      rawBody: png(16, index % 50),
      headers: { "content-type": "image/png" },
    });
    assert.equal(response.status, 201, `burst upload ${index + 1}`);
  }
  await upload("61st upload in 10 minutes", { bytes: png(16), type: "image/png", token: burst.token }, 429, TOO_MANY);
  await upload("other admins are not limited", { bytes: png(16), type: "image/png", token: sales.token }, 201);

  // ---- storage cap (§2): 507, neutral message, nothing stored, private alert ----------------------
  usage = await client.getRecord("system", "uploads-usage");
  const before = await client.listRecords("uploads");
  client.emails.length = 0;
  client.setEnv({ IMAGE_STORAGE_LIMIT_BYTES: usage.totalBytes + 100 });
  await upload("upload that fits under the cap", { bytes: png(100), type: "image/png" }, 201);
  await upload("cap exceeded", { bytes: png(64), type: "image/png" }, 507, UNAVAILABLE);
  assert.doesNotMatch(UNAVAILABLE, /storage|limit|quota|GB|bytes/i);
  assert.equal((await client.listRecords("uploads")).length, before.length + 1, "the refused upload stored nothing");
  assert.equal((await client.getRecord("system", "uploads-usage")).totalBytes, usage.totalBytes + 100);

  assert.equal(storageAlerts(client).length, 1, "refused upload alerts the developer");
  const [refusedAlert] = storageAlerts(client);
  assert.deepEqual(refusedAlert.to, [DEVELOPER_MAILBOX], "never an admin address");
  assert.match(refusedAlert.subject, /^Juwon Electric: image storage at \d+\.\d{2} GB$/);
  assert.match(refusedAlert.html, /refused/);

  client.emails.length = 0;
  await upload("cap exceeded again", { bytes: png(64), type: "image/png" }, 507, UNAVAILABLE);
  assert.equal(storageAlerts(client).length, 0, "alert throttled for 7 days");
  client.setEnv({ IMAGE_STORAGE_LIMIT_BYTES: "0" });
  await upload("0 means the default cap", { bytes: png(64), type: "image/png" }, 201);
  client.setEnv({ IMAGE_STORAGE_LIMIT_BYTES: undefined });

  // ---- nothing about storage reaches admins -----------------------------------------------------------
  await expect("config still has no usage", "GET", "/admin/uploads/config", {}, 200);
  const allAudits = (await expect("audit log", "GET", "/admin/audit-logs?limit=100", { project: (body) => body.data.total }, 200)).body.data;
  for (const item of allAudits.items) assert.doesNotMatch(`${item.action} ${item.summary}`, /storage|quota|GB\b|alert/i);
  const notifications = (await expect("notifications", "GET", "/admin/notifications", { project: (body) => body.data.total }, 200)).body.data;
  for (const item of notifications.items) assert.doesNotMatch(`${item.title} ${item.message}`, /storage|image/i);

  // ---- settings (§7): uploads.provider accepts url or r2 -------------------------------------------
  const saved = (await expect("uploads provider r2", "PUT", "/admin/settings", { body: { uploads: { provider: "r2" } } }, 200)).body.data;
  assert.deepEqual(saved.uploads, { provider: "r2" });
  await expect("uploads provider unknown", "PUT", "/admin/settings", { body: { uploads: { provider: "s3" } } }, 400, "Upload provider is not valid.");
  await expect("uploads provider back to url", "PUT", "/admin/settings", { body: { uploads: { provider: "url" } } }, 200);

  // ---- daily sweep (§3) ---------------------------------------------------------------------------------
  const make = async (label, bytes, purpose) =>
    (await upload(label, { bytes, type: "image/png", purpose }, 201)).body.data;
  const inProduct = await make("image for a product", png(111, 3), "products");
  const inTeam = await make("image for a team member", png(112, 4), "team");
  const inFaq = await make("image inside an FAQ answer", png(113, 5), "other");
  const inCategory = await make("image for a category", png(114, 6), "categories");
  const abandoned = await make("abandoned image", png(115, 7), "services");
  const recent = await make("recent unreferenced image", png(116, 8), "services");
  const onJob = await make("photo for an installation job", png(117, 9), "jobs");
  const onStaff = await make("photo for a staff profile", png(118, 10), "staff");

  await expect("product references its image", "POST", "/admin/products", {
    project: (response) => response.message,
    body: { sku: "PANEL-550", name: "550W Panel", price: 95000, images: ["https://example.test/a.jpg", inProduct.url] },
  }, 201);
  await expect("team member references its photo", "POST", "/admin/team", {
    project: (response) => response.message,
    body: { name: "Ada Obi", role: "Engineer", group: "Engineering", photoUrl: inTeam.url },
  }, 201);
  await expect("faq answer mentions the image", "POST", "/admin/faqs", {
    project: (response) => response.message,
    body: { question: "What does a finished install look like?", answer: `See the photo at ${inFaq.url} for an example.` },
  }, 201);
  await expect("category references its image", "POST", "/admin/categories", {
    project: (response) => response.message,
    body: { name: "Solar panels", imageUrl: inCategory.url },
  }, 201);
  await expect("staff profile references its photo", "PUT", `/admin/staff/${engineer.id}`, {
    token: hr.token,
    project: (response) => response.message,
    body: { profile: { avatarUrl: onStaff.url } },
  }, 200);
  await expect("install package", "POST", "/admin/packages", {
    project: (response) => response.message,
    body: { legacyId: 9301, type: "tubular", name: "Upload Kit", kva: 3, load: "Lights", options: [{ name: "Standard", price: 300000, kits: "1 battery" }] },
  }, 201);
  const order = (await expect("order that needs installation", "POST", "/order", {
    token: null,
    project: (response) => response.message,
    body: { name: "Photo Customer", phoneNumber: "08011112222", deliveryAddress: "Photo Street, Lekki", order: [{ id: 9301, quantity: 1, optionName: "Standard" }] },
  }, 201)).body.data;
  const job = (await expect("job for the engineer", "POST", "/admin/jobs", {
    project: (response) => response.message,
    body: { orderId: order.id, engineerId: engineer.id },
  }, 201)).body.data;
  await expect("engineer saves the job photo", "PUT", `/admin/me/jobs/${job.id}`, {
    token: engineer.token,
    project: (response) => ({ message: response.message, photos: response.data.photos.map(maskKey) }),
    body: { photos: [onJob.url] },
  }, 200);

  // Everything uploaded so far becomes older than 24 hours, except `recent`.
  const old = new Date(Date.now() - DAY_MS - 60_000).toISOString();
  const everything = await client.listRecords("uploads");
  for (const item of everything) {
    if (item.id !== recent.id) await client.patchRecord("uploads", item.id, { createdAt: old });
  }
  const kept = new Set([inProduct.id, inTeam.id, inFaq.id, inCategory.id, onJob.id, onStaff.id, recent.id]);
  client.emails.length = 0;
  await client.runScheduled();

  const remaining = await client.listRecords("uploads");
  assert.deepEqual(remaining.map((item) => item.id).sort(), [...kept].sort(), "only referenced or recent uploads remain");
  assert.equal(await client.hasStoredImage(abandoned.key), false, "abandoned file deleted");
  assert.equal(await client.hasStoredImage(first.key), false);
  assert.equal(await client.hasStoredImage(inProduct.key), true, "referenced file kept");
  assert.equal(await client.hasStoredImage(onJob.key), true, "job photo kept");
  assert.equal(await client.hasStoredImage(onStaff.key), true, "staff photo kept");
  assert.equal(await client.hasStoredImage(jobPhoto.key), false, "unsaved job photo swept");
  assert.equal(await client.hasStoredImage(recent.key), true, "recent file kept");
  assert.equal((await fetchImage("swept image is gone", `/uploads/${abandoned.key}`, null)).step.status, 404);
  assert.equal((await fetchImage("referenced image still served", `/uploads/${inTeam.key}`, png(112, 4))).step.sameBytes, true);
  usage = await client.getRecord("system", "uploads-usage");
  assert.equal(usage.totalBytes, sum(remaining), "usage total consistent after the sweep");
  assert.equal(storageAlerts(client).length, 0, "below the alert threshold");

  // A drifted total is reconciled from the records.
  await client.patchRecord("system", "uploads-usage", { totalBytes: 123_456_789 });
  await client.runScheduled();
  assert.equal((await client.getRecord("system", "uploads-usage")).totalBytes, sum(remaining), "reconciled");

  // ---- private alert (§4): threshold, recipients, 7-day throttle -----------------------------------
  client.setEnv({ STORAGE_ALERT_BYTES: 500 });
  client.emails.length = 0;
  await client.runScheduled();
  assert.equal(storageAlerts(client).length, 0, "the refused-upload alert still throttles");

  await client.patchRecord("system", "uploads-usage", { lastAlertAt: new Date(Date.now() - 8 * DAY_MS).toISOString() });
  await client.runScheduled();
  assert.equal(storageAlerts(client).length, 1, "alert once over the threshold");
  const [alert] = storageAlerts(client);
  assert.deepEqual(alert.to, [DEVELOPER_MAILBOX]);
  for (const address of [ALERT_MAILBOX, sales.email, burst.email]) assert.ok(!alert.to.includes(address));
  assert.equal(alert.subject, `Juwon Electric: image storage at ${(sum(remaining) / 1e9).toFixed(2)} GB`);
  assert.match(alert.html, /free tier/);
  assert.ok((await client.getRecord("system", "uploads-usage")).lastAlertAt);

  client.emails.length = 0;
  await client.runScheduled();
  await client.runScheduled();
  assert.equal(storageAlerts(client).length, 0, "throttled for 7 days");

  await client.patchRecord("system", "uploads-usage", { lastAlertAt: new Date(Date.now() - 6 * DAY_MS).toISOString() });
  await client.runScheduled();
  assert.equal(storageAlerts(client).length, 0, "6 days later: still throttled");

  client.setEnv({ STORAGE_ALERT_BYTES: undefined });
  await client.patchRecord("system", "uploads-usage", { lastAlertAt: null });
  await client.runScheduled();
  assert.equal(storageAlerts(client).length, 0, "under the default 8 GB threshold");

  client.setEnv({ STORAGE_ALERT_BYTES: 500, STORAGE_ALERT_EMAIL: `${ALERT_MAILBOX}, ${sales.email}` });
  await client.runScheduled();
  assert.equal(storageAlerts(client).length, 0, "admin-only recipients are never emailed");
  client.setEnv({ STORAGE_ALERT_BYTES: undefined, ...UPLOADS_ENV });

  return transcript;
};
