// Pure upload rules (backend/shared/uploads.js): signatures, keys, references, sweep limits,
// alert throttle and recipients, env settings. Runtime flows: test/scenarios/uploads.js.
import assert from "node:assert/strict";
import { test } from "node:test";
import { isImageUrl, isLocalHttpUrl, isSafeUrl } from "../shared/fields.js";
import {
  alertAllowed,
  alertRecipients,
  bytesSetting,
  isReferenced,
  isUploadKey,
  matchesSignature,
  referenceTexts,
  storageAlertEmail,
  storageLimitBytes,
  sweepCandidates,
  uploadKey,
  uploadUrl,
} from "../shared/uploads.js";

const UUID = "0b7a1e0c-3c55-4d7e-9a53-2c3f4f6f7a10";

test("signatures match only the declared type", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]);
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xdb]);
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20]);
  assert.equal(matchesSignature(png, "image/png"), true);
  assert.equal(matchesSignature(png, "image/jpeg"), false);
  assert.equal(matchesSignature(jpeg, "image/jpeg"), true);
  assert.equal(matchesSignature(webp, "image/webp"), true);
  assert.equal(matchesSignature(webp.slice(0, 10), "image/webp"), false);
  assert.equal(matchesSignature(new TextEncoder().encode("<svg"), "image/svg+xml"), false);
});

test("keys have a fixed shape and reject traversal", () => {
  const key = uploadKey("team", "image/webp", UUID, new Date("2026-01-05T00:00:00Z"));
  assert.equal(key, `team/2026/01/${UUID}.webp`);
  assert.equal(isUploadKey(key), true);
  for (const bad of [
    `../team/2026/01/${UUID}.webp`,
    `team/2026/01/../${UUID}.webp`,
    `team/2026/01/${UUID}.webp/..`,
    `team/2026/01/${UUID}.svg`,
    `team/2026/01/${UUID.toUpperCase()}.webp`,
    `team\\2026\\01\\${UUID}.webp`,
    `etc/2026/01/${UUID}.webp`,
    "",
  ]) {
    assert.equal(isUploadKey(bad), false, bad);
  }
  assert.equal(uploadUrl("https://images.juwon.test/", "http://x", key), `https://images.juwon.test/${key}`);
  assert.equal(uploadUrl("", "http://localhost:8787", key), `http://localhost:8787/uploads/${key}`);
});

test("references cover image fields, nested paths and rich text", () => {
  const key = `products/2026/09/${UUID}.png`;
  const texts = referenceTexts({
    products: [{ images: ["https://a.test/x.png"], descriptionHtml: `<img src="http://localhost:8787/uploads/${key}">` }],
    admins: [{ profile: { avatarUrl: "https://a.test/avatar.png" } }],
  });
  assert.equal(isReferenced({ key, url: `https://images.test/${key}` }, texts), true, "matched by key under another origin");
  assert.equal(isReferenced({ key: `products/2026/09/${UUID.replace(/0$/, "1")}.png` }, texts), false);
});

test("sweep: unreferenced, older than 24 hours, oldest first, at most 500", () => {
  const now = Date.parse("2026-09-17T12:00:00Z");
  const uploads = Array.from({ length: 700 }, (_, index) => ({
    id: String(index),
    key: `other/2026/09/${String(index).padStart(12, "0")}.png`,
    createdAt: new Date(now - 25 * 3600 * 1000 - index * 1000).toISOString(),
  }));
  uploads.push({ id: "fresh", key: "other/2026/09/fresh.png", createdAt: new Date(now - 3600 * 1000).toISOString() });
  const texts = [`see ${uploads[699].key}`];
  const plan = sweepCandidates(uploads, texts, now);
  assert.equal(plan.length, 500);
  assert.equal(plan[0].id, "698", "oldest unreferenced first");
  assert.ok(!plan.some((upload) => upload.id === "699" || upload.id === "fresh"));
});

test("alert throttle, recipients and email", () => {
  const now = Date.parse("2026-09-17T12:00:00Z");
  assert.equal(alertAllowed({ lastAlertAt: null }, now), true);
  assert.equal(alertAllowed({ lastAlertAt: new Date(now - 6 * 86400000).toISOString() }, now), false);
  assert.equal(alertAllowed({ lastAlertAt: new Date(now - 7 * 86400000).toISOString() }, now), true);
  assert.deepEqual(
    alertRecipients("Dev@Example.test, owner@juwon.test, not-an-email", ["Owner <owner@juwon.test>", ["x@y.test"]]),
    ["dev@example.test"]
  );
  const email = storageAlertEmail({ totalBytes: 8_123_456_789, alertBytes: 8e9, limitBytes: 9e9 });
  assert.equal(email.subject, "Juwon Electric: image storage at 8.12 GB");
  assert.match(email.text, /free tier/);
});

test("byte settings: unset, 0 and invalid mean the default", () => {
  assert.equal(storageLimitBytes({}), 9_000_000_000);
  assert.equal(storageLimitBytes({ IMAGE_STORAGE_LIMIT_BYTES: "0" }), 9_000_000_000);
  assert.equal(storageLimitBytes({ IMAGE_STORAGE_LIMIT_BYTES: "abc" }), 9_000_000_000);
  assert.equal(bytesSetting("1500", 1), 1500);
});

test("image URLs: https, site paths and http only on localhost or 127.0.0.1", () => {
  for (const ok of ["http://localhost:8787/uploads/a.png", "http://127.0.0.1/uploads/a.png", "https://x.test/a.png", "/a.png"]) {
    assert.equal(isImageUrl(ok), true, ok);
  }
  for (const bad of ["http://example.com/a.png", "http://localhost.evil.test/a.png", "http://0.0.0.0/a.png", "javascript:alert(1)", "//x.test/a.png"]) {
    assert.equal(isImageUrl(bad), false, bad);
  }
  assert.equal(isLocalHttpUrl("https://localhost/a.png"), false);
  assert.equal(isSafeUrl("http://localhost:8787/a.png"), false, "non-image fields unchanged");
});
