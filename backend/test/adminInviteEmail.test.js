import assert from "node:assert/strict";
import { test } from "node:test";
import { adminInviteEmail } from "../shared/adminInviteEmail.js";

const base = {
  name: "Ada <Admin>",
  email: "ada@juwon.test",
  role: "admin",
  token: "tok123",
  expiresAt: "2026-09-16T10:00:00.000Z",
};

test("invite email has subject, token, expiry and the admin link", () => {
  const email = adminInviteEmail({ ...base, adminUrl: "https://admin.juwon.test/login" });
  assert.equal(email.subject, "Set up your Juwon Electric admin account");
  for (const part of [email.html, email.text]) {
    assert.ok(part.includes("tok123"));
    assert.ok(part.includes("https://admin.juwon.test/login"));
    assert.ok(part.includes("Wed, 16 Sep 2026 10:00:00 GMT"));
  }
  assert.ok(email.html.includes('<a href="https://admin.juwon.test/login"'));
  assert.ok(email.html.includes("Ada &lt;Admin&gt;"), "names are escaped");
});

test("invite email links only absolute http(s) URLs", () => {
  for (const adminUrl of [undefined, "", "javascript:alert(1)", "/admin", "https://x.test/\"onmouseover=1"]) {
    const email = adminInviteEmail({ ...base, adminUrl });
    assert.ok(!email.html.includes("<a "), String(adminUrl));
  }
});
