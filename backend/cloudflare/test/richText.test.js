// Contract §0.5 fixture suite, through the Worker's own import path (as wrangler bundles it)
// and end to end: a vacancy description written through the Worker is stored sanitised.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { TEST_ENV } from "../../test/scenarios/adminUsers.js";
import { sanitizeRichText } from "../../shared/richText.js";
import { createWorkerClient } from "./helpers/worker.js";

const fixtures = JSON.parse(readFileSync(new URL("../../shared/__fixtures__/richText.json", import.meta.url), "utf8"));

test("rich text fixtures (Worker)", () => {
  for (const { name, input, output } of fixtures) {
    assert.equal(sanitizeRichText(input), output, name);
  }
});

test("Worker stores descriptionHtml exactly as the fixtures sanitise it", async () => {
  const { request } = createWorkerClient(TEST_ENV);
  const login = await request("POST", "/admin/auth/login", {
    body: { username: TEST_ENV.SUPERADMIN_EMAIL, password: TEST_ENV.SUPERADMIN_PASSWORD },
  });
  const token = login.body.data.token;
  for (const { name, input, output } of fixtures.filter((fixture) => typeof fixture.input === "string")) {
    const response = await request("POST", "/admin/vacancies", { token, body: { title: name.slice(0, 100), descriptionHtml: input } });
    assert.equal(response.status, 201, name);
    assert.equal(response.body.data.descriptionHtml, output.trim(), name);
  }
});
