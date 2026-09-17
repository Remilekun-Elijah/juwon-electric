import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, test } from "node:test";
import { runCatalogScenario } from "../../test/scenarios/catalog.js";
import { STATIC_TOKEN, workerOpsClient } from "../../test/scenarios/opsKit.js";
import { D1Stub, applyMigrations } from "./helpers/d1.js";

const client = await workerOpsClient();
after(() => client.close());

test("Worker: categories, products and package items", async () => {
  await runCatalogScenario(client);
});

test("Worker: product descriptionHtml is stored exactly as the shared rich-text fixtures sanitise it", async () => {
  const fixtures = JSON.parse(readFileSync(new URL("../../shared/__fixtures__/richText.json", import.meta.url), "utf8"));
  let index = 0;
  for (const { name, input, output } of fixtures.filter((fixture) => typeof fixture.input === "string")) {
    index += 1;
    const response = await client.request("POST", "/admin/products", {
      token: STATIC_TOKEN,
      body: { sku: `RT-${index}`, name: `Rich text ${index}`, price: 1, descriptionHtml: input },
    });
    if (output.trim().length > 50000) {
      assert.equal(response.status, 400, name);
      continue;
    }
    assert.equal(response.status, 201, `${name}: ${JSON.stringify(response.body)}`);
    assert.equal(response.body.data.descriptionHtml, output.trim(), name);
  }
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
