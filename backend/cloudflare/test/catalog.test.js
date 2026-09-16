import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, test } from "node:test";
import { runCatalogScenario } from "../../test/scenarios/catalog.js";
import { workerOpsClient } from "../../test/scenarios/opsKit.js";
import { D1Stub, applyMigrations } from "./helpers/d1.js";

const client = await workerOpsClient();
after(() => client.close());

test("Worker: categories, products and package items", async () => {
  await runCatalogScenario(client);
});

test("migration 0010 applies on a seeded database at 0006, is idempotent, and enforces case-insensitive SKUs", () => {
  const d1 = applyMigrations(new D1Stub(), { upTo: 6 });
  d1.db.exec(readFileSync(new URL("../seed.sql", import.meta.url), "utf8"));
  const sql = readFileSync(new URL("../migrations/0010_catalog.sql", import.meta.url), "utf8");
  d1.db.exec(sql);
  d1.db.exec(sql);

  const insert = d1.db.prepare(
    "INSERT INTO records (id, collection, slug, data, is_active, sort_order, created_at, updated_at) VALUES (?, 'products', ?, ?, 1, 0, 'x', 'x')"
  );
  insert.run("p1", "one", JSON.stringify({ sku: "ABC-1" }));
  assert.throws(() => insert.run("p2", "two", JSON.stringify({ sku: "abc-1" })), /UNIQUE/);
  assert.throws(() => insert.run("p3", "one", JSON.stringify({ sku: "XYZ" })), /UNIQUE/);
});
