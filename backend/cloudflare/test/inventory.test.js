import assert from "node:assert/strict";
import { after, test } from "node:test";
import worker from "../src/index.js";
import { runInventoryScenario } from "../../test/scenarios/inventory.js";
import { workerOpsClient } from "../../test/scenarios/opsKit.js";

const client = await workerOpsClient();
after(() => client.close());

test("Worker: inventory adjustments, movements and low-stock alerts", async () => {
  await runInventoryScenario(client);
});

test("Worker: the cron trigger sends the low-stock digest", async () => {
  client.emails.length = 0;
  const pending = [];
  await worker.scheduled({ cron: "0 7 * * *" }, client.env, { waitUntil: (promise) => pending.push(promise) });
  await Promise.all(pending);
  assert.equal(client.emails.length, 1);
  assert.match(client.emails[0].subject, /^Low stock report: \d+ products?$/);
});

test("Worker: a failed guard rolls back the whole stock batch", async () => {
  const { applyStockChanges } = await import("../src/ops/stock.js");
  const created = await client.request("POST", "/admin/products", {
    token: "static-admin-token-for-ops-tests-0123456789",
    body: { sku: "ATOM-1", name: "Atomic", price: 1, stockQuantity: 3 },
  });
  const id = created.body.data.id;
  const before = await client.env.DB.prepare("SELECT COUNT(*) AS n FROM records WHERE collection = 'inventoryMovements'").first("n");

  // A record update whose compare-and-set cannot match (the row changes under the batch).
  const db = client.env.DB;
  const realBatch = db.batch.bind(db);
  let tampered = false;
  db.batch = async (statements) => {
    if (!tampered) {
      tampered = true;
      db.db.prepare("UPDATE records SET data = json_set(data, '$.touched', 1) WHERE id = ?").run(id);
    }
    return realBatch(statements);
  };
  try {
    const result = await applyStockChanges(client.env, { lines: [{ productId: id, change: -1 }], reason: "correction" });
    assert.equal(result.plans[0].after, 2, "retried on the fresh row");
  } finally {
    db.batch = realBatch;
  }
  const after = await client.env.DB.prepare("SELECT COUNT(*) AS n FROM records WHERE collection = 'inventoryMovements'").first("n");
  assert.equal(after - before, 1, "exactly one movement despite the failed first attempt");
  assert.equal(await client.env.DB.prepare("SELECT COUNT(*) AS n FROM batch_guard").first("n"), 0);
});
