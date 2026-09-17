import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, test } from "node:test";
import { runOrdersScenario } from "../../test/scenarios/orders.js";
import { workerOpsClient } from "../../test/scenarios/opsKit.js";
import { serializeOrder } from "../../shared/orders.js";
import { D1Stub, applyMigrations } from "./helpers/d1.js";

const client = await workerOpsClient();
after(() => client.close());

test("Worker: order fulfilment, payment, assignment and stock commitment", async () => {
  await runOrdersScenario(client);
});

test("migration 0011 backfills legacy orders exactly like the read-time rules, and is idempotent", () => {
  const d1 = applyMigrations(new D1Stub(), { upTo: 10 });
  d1.db.exec(readFileSync(new URL("../seed.sql", import.meta.url), "utf8"));
  const legacy = {
    o1: { id: "o1", name: "A", status: "completed", paymentStatus: "unpaid" },
    o2: { id: "o2", name: "B", status: "pending", paymentStatus: "partial" },
    o3: { id: "o3", name: "C", status: "cancelled", paymentStatus: "refunded", requiresInstallation: true },
    o4: { id: "o4", name: "D" },
    o5: { id: "o5", name: "E", status: "weird", paymentStatus: "later" },
    o6: { id: "o6", name: "F", status: "pending", paymentStatus: "paid", assignedEngineerId: "eng-1" },
  };
  const insert = d1.db.prepare(
    "INSERT INTO records (id, collection, slug, data, is_active, sort_order, created_at, updated_at) VALUES (?, 'orders', NULL, ?, 1, 0, 'x', 'x')"
  );
  for (const order of Object.values(legacy)) insert.run(order.id, JSON.stringify(order));

  const sql = readFileSync(new URL("../migrations/0011_orders_fulfilment.sql", import.meta.url), "utf8");
  d1.db.exec(sql);
  const once = d1.db.prepare("SELECT id, data FROM records WHERE collection = 'orders' ORDER BY id").all();
  d1.db.exec(sql);
  const twice = d1.db.prepare("SELECT id, data FROM records WHERE collection = 'orders' ORDER BY id").all();
  assert.deepEqual(twice, once, "idempotent");

  for (const row of once) {
    const migrated = JSON.parse(row.data);
    assert.deepEqual(serializeOrder(migrated), serializeOrder(legacy[row.id]), row.id);
    // Commerce v2 fields (channel, subtotal, discount, createdBy) are read-time defaults only.
    const { channel: _channel, subtotal: _subtotal, discount: _discount, createdBy: _createdBy, ...stored } = serializeOrder(legacy[row.id]);
    assert.deepEqual(migrated, stored, `${row.id} is stored in its final form`);
  }
});
