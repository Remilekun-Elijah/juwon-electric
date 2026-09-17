// Image URL fields accept http:// only on localhost or 127.0.0.1 (any port), so local uploads
// served from the API origin can be saved (UPLOADS_V1 integration decision). Other URLs stay
// https-only, other schemes stay rejected and non-image URL fields keep their rules.
// Runtime-agnostic scenario; returns the transcript for parity.
import assert from "node:assert/strict";
import { recorder } from "./opsKit.js";

const HTTPS_ONLY = (label) => `${label} must be an https:// URL or a path starting with /.`;
const LOCAL = [
  "http://localhost:8787/uploads/products/2026/09/0b7a1e0c-3c55-4d7e-9a53-2c3f4f6f7a10.webp",
  "http://127.0.0.1:9000/uploads/team/2026/09/0b7a1e0c-3c55-4d7e-9a53-2c3f4f6f7a11.png",
  "http://LOCALHOST/uploads/other/2026/09/0b7a1e0c-3c55-4d7e-9a53-2c3f4f6f7a12.jpg",
];
const REJECTED = [
  "http://example.com/image.png",
  "http://localhost.example.com/image.png",
  "http://127.0.0.1.nip.io/image.png",
  "http://user:pass@localhost/image.png",
  "http://[::1]:8787/image.png",
  "javascript:alert(1)",
  "ftp://localhost/image.png",
  "data:image/png;base64,AAAA",
];

const message = (body) => body?.message;

export const runLocalImageUrlsScenario = async (client) => {
  const { transcript, expect } = recorder(client);
  let sequence = 0;
  const next = () => (sequence += 1);

  // [label, path, body for an image value, field label in the error message]
  const imageFields = [
    ["product images", "/admin/products", (value) => ({ sku: `IMG-${next()}`, name: `Image product ${sequence}`, price: 1000, images: [value] }), "Each entry in Images"],
    ["category image", "/admin/categories", (value) => ({ name: `Image category ${next()}`, imageUrl: value }), "Image URL"],
    ["service image", "/admin/services", (value) => ({ title: `Image service ${next()}`, subtitle: "Solar installs", image: value }), "Image"],
    ["portfolio image", "/admin/portfolio", (value) => ({ name: `Image project ${next()}`, image: value }), "Image"],
    ["segment image", "/admin/services/customer-segments", (value) => ({ title: `Image segment ${next()}`, subtitle: "Homes", image: value }), "Image"],
  ];

  for (const [label, path, bodyFor, fieldLabel] of imageFields) {
    for (const value of LOCAL) {
      await expect(`${label} accepts ${value.slice(0, 22)}`, "POST", path, { body: bodyFor(value), project: message }, 201);
    }
    await expect(`${label} accepts https`, "POST", path, { body: bodyFor("https://images.juwon.test/a.webp"), project: message }, 201);
    await expect(`${label} accepts a site path`, "POST", path, { body: bodyFor("/images/a.webp"), project: message }, 201);
    for (const value of REJECTED) {
      await expect(`${label} rejects ${value}`, "POST", path, { body: bodyFor(value), project: message }, 400, HTTPS_ONLY(fieldLabel));
    }
  }

  const product = (
    await expect("local product image is stored as sent", "POST", "/admin/products", {
      body: { sku: "IMG-STORED", name: "Stored image product", price: 1000, images: [LOCAL[0]] },
      project: message,
    }, 201)
  ).body.data;
  assert.deepEqual(product.images, [LOCAL[0]]);

  // Staff avatars are image fields too.
  const engineer = await client.seedAdmin("engineer");
  await expect("staff avatar accepts local http", "PUT", `/admin/staff/${engineer.id}`, { body: { profile: { avatarUrl: LOCAL[1] } }, project: message }, 200);
  await expect("staff avatar rejects remote http", "PUT", `/admin/staff/${engineer.id}`, { body: { profile: { avatarUrl: REJECTED[0] } } }, 400, HTTPS_ONLY("Avatar URL"));

  // Non-image URL fields are unchanged.
  await expect("business website stays https-only", "PUT", "/admin/settings", { body: { business: { name: "Juwon Electric", website: "http://localhost:3100" } } }, 400, HTTPS_ONLY("Website"));
  await expect("portfolio link stays https-only", "POST", "/admin/portfolio", {
    body: { name: "Link project", image: LOCAL[0], link: "http://localhost:3100/projects/1" },
  }, 400, HTTPS_ONLY("Link"));
  await expect("service CTA URL stays https-only", "POST", "/admin/services", {
    body: { title: "CTA service", subtitle: "Solar", image: LOCAL[0], ctaUrl: "http://127.0.0.1:3100/packages" },
  }, 400, HTTPS_ONLY("CTA URL"));
  await expect("team LinkedIn stays https-only", "POST", "/admin/team", {
    body: { name: "Local member", role: "Engineer", group: "Engineering", photoUrl: LOCAL[0], linkedinUrl: "http://localhost/in/member" },
  }, 400, "LinkedIn URL must be an https URL.");

  return transcript;
};
