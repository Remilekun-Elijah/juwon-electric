// Landing v1 §4: seeds/sample-website.sql is up to date with backend/shared/sampleWebsite.js,
// applies on top of the catalog seed, is idempotent, and keeps records and settings sections an
// admin has saved since.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, test } from "node:test";
import { SAMPLE_WEBSITE_SQL_PATH, buildSampleWebsiteSql } from "../scripts/export-sample-website-sql.mjs";
import { STATIC_TOKEN, workerOpsClient } from "../../test/scenarios/opsKit.js";

const client = await workerOpsClient();
after(() => client.close());

const sqlFile = readFileSync(SAMPLE_WEBSITE_SQL_PATH, "utf8");
const catalogSeed = readFileSync(new URL("../seed.sql", import.meta.url), "utf8");
const get = async (path, token = null) => {
  const response = await client.request("GET", path, { token });
  assert.equal(response.status, 200, `${path}: ${JSON.stringify(response.body)}`);
  return response.body.data;
};

test("sample-website.sql is generated from the shared module and says local only", () => {
  assert.equal(sqlFile, buildSampleWebsiteSql(), "run npm run d1:seed:sample:export");
  assert.match(sqlFile.split("\n")[0], /^-- LOCAL DEVELOPMENT ONLY\. NEVER run this file with --remote/);
});

test("Worker: sample SQL seeds content, portfolio and settings idempotently", async () => {
  await client.env.DB.exec(catalogSeed);
  await client.env.DB.exec(sqlFile);
  await client.env.DB.exec(sqlFile);

  const faqs = await get("/faqs");
  assert.equal(faqs.length, 8);
  assert.equal(faqs[0].question, "Do I pay to place an order?");
  assert.ok(faqs.every((item) => item.sample === true));
  assert.equal((await get("/faqs?category=Products")).length, 3);
  assert.equal((await get("/testimonials")).length, 6);
  assert.deepEqual((await get("/clients")).map((item) => item.logoUrl)[0], "/samples/client-1.svg");

  const portfolio = await get("/portfolio");
  assert.equal(portfolio.length, 15);
  assert.ok(portfolio.every((item) => item.sample === true && item.summary && item.location && item.system));
  assert.equal((await get("/portfolio?category=hospitals")).length, 2);

  const settings = await get("/settings/public");
  assert.equal(settings.website.whatsappNumber, "+2348000000000");
  assert.equal(settings.website.stats.length, 4);
  assert.deepEqual(settings.financing.termsMonths, [3, 6, 12]);
  assert.equal(settings.calculator.appliances.length, 12);
  assert.equal(settings.business.name, "Juwon Electric");

  // Admin saves: a FAQ, a portfolio item and the website section. Re-seeding keeps them.
  const put = (path, body) => client.request("PUT", path, { token: STATIC_TOKEN, body });
  assert.equal((await put("/admin/faqs/sample-faq-1", { answer: "Our own answer." })).status, 200);
  const first = portfolio[0];
  assert.equal((await put(`/admin/portfolio/${first.id}`, { name: first.name, image: first.image, summary: "Real summary." })).status, 200);
  assert.equal((await put("/admin/settings", { website: { whatsappNumber: "+2348011111111" } })).status, 200);
  await client.env.DB.exec(sqlFile);

  const kept = await get("/admin/faqs", STATIC_TOKEN);
  assert.equal(kept.find((item) => item.id === "sample-faq-1").answer, "Our own answer.");
  assert.equal((await get(`/portfolio/${first.id}`)).summary, "Real summary.");
  const after = await get("/admin/settings", STATIC_TOKEN);
  assert.deepEqual([after.website.whatsappNumber, after.website.sample], ["+2348011111111", false]);
  assert.equal(after.financing.sample, true, "sample sections are refreshed");
});
