// Landing v1 §4/§8 and Team and motion v1 §1: the sample data module validates against the payload rules, and the Express
// seed (backend/scripts/seed-sample-website.mjs) is idempotent on a throwaway JSON store and
// refuses to run under NODE_ENV=production.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { clientPayload, faqPayload, portfolioCaseStudyPayload, teamMemberPayload, testimonialPayload } from "../shared/content.js";
import {
  SAMPLE_CLIENTS,
  SAMPLE_FAQS,
  SAMPLE_PORTFOLIO,
  SAMPLE_SETTINGS,
  SAMPLE_TEAM_MEMBERS,
  SAMPLE_TESTIMONIALS,
  isSeedableSection,
} from "../shared/sampleWebsite.js";
import { mergeSettings, planSettingsUpdate } from "../shared/settings.js";

const backend = fileURLToPath(new URL("..", import.meta.url));
const dir = mkdtempSync(join(tmpdir(), "je-sample-seed-"));
Object.assign(process.env, { NODE_ENV: "test", JSON_STORE_PATH: join(dir, "db.json") });
after(() => rmSync(dir, { recursive: true, force: true }));

const withoutMeta = ({ id: _id, createdAt: _c, updatedAt: _u, sample: _s, ...fields }) => fields;

test("sample data: counts, fixed sample- ids and sample: true everywhere", () => {
  assert.equal(SAMPLE_FAQS.length, 8);
  assert.equal(SAMPLE_TESTIMONIALS.length, 6);
  assert.equal(SAMPLE_CLIENTS.length, 6);
  assert.equal(SAMPLE_TEAM_MEMBERS.length, 12);
  const records = [...SAMPLE_FAQS, ...SAMPLE_TESTIMONIALS, ...SAMPLE_CLIENTS, ...SAMPLE_TEAM_MEMBERS];
  assert.equal(new Set(records.map((item) => item.id)).size, records.length);
  for (const item of records) {
    assert.match(item.id, /^sample-[a-z]+-\d+$/);
    assert.equal(item.sample, true);
  }
  for (const section of Object.values(SAMPLE_SETTINGS)) assert.equal(section.sample, true);
  assert.deepEqual(SAMPLE_CLIENTS.map((item) => item.logoUrl), [1, 2, 3, 4, 5, 6].map((n) => `/samples/client-${n}.svg`));
  assert.deepEqual(SAMPLE_TEAM_MEMBERS.map((item) => item.photoUrl), Array.from({ length: 12 }, (_, n) => `/samples/team/member-${n + 1}.svg`));
  assert.ok(SAMPLE_TEAM_MEMBERS.every((item) => item.linkedinUrl === null && item.bio && item.bio.split(". ").length === 1));
  assert.deepEqual(
    [...new Set(SAMPLE_TEAM_MEMBERS.map((item) => item.group))],
    ["Leadership", "Engineering & installations", "Sales & customer care", "Operations"],
    "four groups, in page order"
  );
  const ratings = SAMPLE_TESTIMONIALS.map((item) => item.rating);
  assert.ok(ratings.every((rating) => rating >= 4 && rating <= 5));
  assert.ok(new Set(SAMPLE_TESTIMONIALS.map((item) => item.source)).size >= 3, "mixed sources");
});

test("sample data passes the create payload rules unchanged", () => {
  for (const [items, build] of [[SAMPLE_FAQS, faqPayload], [SAMPLE_TESTIMONIALS, testimonialPayload], [SAMPLE_CLIENTS, clientPayload], [SAMPLE_TEAM_MEMBERS, teamMemberPayload]]) {
    for (const item of items) {
      const payload = build(withoutMeta(item));
      assert.deepEqual(withoutMeta(payload), withoutMeta(item), item.id);
    }
  }
  const catalogIds = JSON.parse(readFileSync(join(backend, "data/catalog-ids.json"), "utf8")).collections.portfolio;
  const idsBySlug = Object.entries(catalogIds).map(([key, value]) => [key.split("#")[0], value.id]);
  assert.equal(SAMPLE_PORTFOLIO.length, idsBySlug.length, "every existing portfolio record");
  for (const { id, slug, sortOrder: _sortOrder, ...fields } of SAMPLE_PORTFOLIO) {
    assert.ok(idsBySlug.some(([key, value]) => key === slug && value === id), `${slug} ${id} is a D1 portfolio record`);
    assert.deepEqual(withoutMeta(portfolioCaseStudyPayload(fields)), fields);
  }
});

test("sample settings pass PUT /admin/settings validation unchanged", () => {
  const input = Object.fromEntries(Object.entries(SAMPLE_SETTINGS).map(([section, value]) => [section, withoutMeta(value)]));
  const { settings } = planSettingsUpdate(mergeSettings(null), input);
  for (const [section, value] of Object.entries(SAMPLE_SETTINGS)) {
    assert.deepEqual({ ...settings[section], sample: true }, value, section);
  }
  assert.equal(SAMPLE_SETTINGS.calculator.appliances.length, 12);
  assert.equal(isSeedableSection("website", undefined), true);
  assert.equal(isSeedableSection("website", mergeSettings(null).website), true, "empty defaults are seedable");
  assert.equal(isSeedableSection("website", { ...mergeSettings(null).website, businessHours: "Mon–Fri" }), false);
  assert.equal(isSeedableSection("financing", { ...SAMPLE_SETTINGS.financing, sample: false }), false);
});

test("Express seed: refuses NODE_ENV=production", () => {
  const productionDb = join(dir, "production.json");
  const result = spawnSync(process.execPath, ["scripts/seed-sample-website.mjs"], {
    cwd: backend,
    env: { ...process.env, NODE_ENV: "production", JSON_STORE_PATH: productionDb, MONGODB_URI: "" },
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Refusing to seed sample website content: NODE_ENV is production/);
  assert.equal(existsSync(productionDb), false, "nothing is written");
});

test("Express seed: dry run on a temp JSON store is idempotent and keeps admin edits", async () => {
  const { seedSampleWebsite } = await import("../scripts/seed-sample-website.mjs");
  const store = await import("../services/store.js");
  const quiet = () => {};

  const first = await seedSampleWebsite({ log: quiet });
  assert.deepEqual([first.created, first.updated, first.kept, first.portfolio], [36, 0, 0, 15]);
  assert.deepEqual(first.portfolioMissing, []);
  assert.deepEqual(first.sections, ["website", "financing", "calculator"]);

  const second = await seedSampleWebsite({ log: quiet });
  assert.deepEqual([second.created, second.updated, second.kept, second.portfolio], [0, 36, 0, 15]);
  assert.equal((await store.listCollection("faqs", { includeInactive: true })).length, 8);
  assert.equal((await store.listCollection("teamMembers", { includeInactive: true })).length, 12);

  // An admin saves one FAQ, one team member and the website section: a re-seed keeps them.
  await store.updateCollectionItem("faqs", "sample-faq-1", { answer: "Our own answer.", sample: false });
  await store.updateCollectionItem("teamMembers", "sample-team-1", { role: "Founder", sample: false });
  const settings = await store.findCollectionItem("settings", { id: "global" });
  await store.updateCollectionItem("settings", settings.id, { website: { ...SAMPLE_SETTINGS.website, whatsappNumber: "+2348011111111", sample: false } });
  const third = await seedSampleWebsite({ log: quiet });
  assert.equal(third.kept, 2);
  assert.equal((await store.getCollectionItem("teamMembers", "sample-team-1")).role, "Founder");
  assert.deepEqual(third.sectionsKept, ["website"]);
  assert.equal((await store.getCollectionItem("faqs", "sample-faq-1")).answer, "Our own answer.");
  const merged = mergeSettings(await store.findCollectionItem("settings", { id: "global" }));
  assert.equal(merged.website.whatsappNumber, "+2348011111111");
  assert.equal(merged.financing.sample, true);

  const portfolio = await store.listCollection("portfolio", { includeInactive: true });
  assert.ok(portfolio.every((item) => item.sample === true && item.summary && item.category));
  assert.equal(portfolio.find((item) => item.sortOrder === 2).location, "Surulere, Lagos");
});
