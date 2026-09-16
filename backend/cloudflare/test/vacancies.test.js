import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { TEST_ENV } from "../../test/scenarios/adminUsers.js";
import { runVacanciesScenario } from "../../test/scenarios/vacancies.js";
import { D1Stub, applyMigrations } from "./helpers/d1.js";
import { createWorkerClient } from "./helpers/worker.js";

const SEED_SQL = readFileSync(new URL("../seed.sql", import.meta.url), "utf8");

const insertVacancy = (d1, id, slug) =>
  d1.db
    .prepare(
      "INSERT INTO records (id, collection, slug, data, is_active, sort_order, created_at, updated_at) VALUES (?, 'vacancies', ?, ?, 1, 0, 'x', 'x')"
    )
    .run(id, slug, JSON.stringify({ id, slug, title: id, status: "draft" }));

test("Worker: vacancies", async () => {
  const { request } = createWorkerClient(TEST_ENV);
  await runVacanciesScenario(request);
});

test("migration 0008 applies on a seeded database at 0006, is idempotent and enforces unique slugs", () => {
  const d1 = applyMigrations(new D1Stub(), { upTo: 6 });
  d1.db.exec(SEED_SQL);
  applyMigrations(d1);
  applyMigrations(d1);

  insertVacancy(d1, "a", "engineer");
  assert.throws(() => insertVacancy(d1, "b", "engineer"), /UNIQUE/);
  // The index is partial: other collections may use the same slug.
  d1.db
    .prepare("INSERT INTO records (id, collection, slug, data, created_at, updated_at) VALUES ('p', 'portfolio', 'engineer', '{}', 'x', 'x')")
    .run();
});

test("migration 0008 fails loudly on duplicate vacancy slugs and keeps the rows", () => {
  const d1 = applyMigrations(new D1Stub(), { upTo: 7 });
  insertVacancy(d1, "a", "same");
  insertVacancy(d1, "b", "same");
  assert.throws(() => applyMigrations(d1), /0008_vacancies\.sql: .*UNIQUE/);
  assert.equal(d1.db.prepare("SELECT COUNT(*) AS n FROM records WHERE collection = 'vacancies'").get().n, 2);
});
