// Atomic stock changes for the Worker (same contract as applyStockChanges in
// backend/services/store.js).
//
// One D1 batch (a transaction) holds: a compare-and-set UPDATE per product, the movement
// INSERTs, and optionally a compare-and-set UPDATE of another record (an order status
// move). After each CAS UPDATE a guard row `INSERT INTO batch_guard (ok) SELECT changes()`
// violates CHECK (ok = 1) when the UPDATE matched nothing, which aborts and rolls back the
// whole batch; the batch then retries against fresh rows. The last statement empties
// batch_guard (migrations/0011_inventory.sql).
import { ApiError, notFound } from "../http.js";
import { notFoundMessage, rowValues } from "../store.js";
import { buildMovement, mergeChanges, planStockChanges } from "../../../shared/inventory.js";
import { withoutUndefined } from "../../../shared/fields.js";

const ATTEMPTS = 5;
const CHANGED_ELSEWHERE = "This record was changed by another request. Please try again.";
const GUARD = "INSERT INTO batch_guard (ok) SELECT changes()";

const isGuardFailure = (error) => /CHECK constraint failed/i.test(String(error?.message || error));

const matchesExpect = (record, expect = {}) =>
  Object.entries(expect).every(([key, value]) =>
    value === null ? record[key] === null || record[key] === undefined : record[key] === value
  );

const loadRows = async (env, collection, ids) => {
  if (!ids.length) return new Map();
  const result = await env.DB.prepare(
    `SELECT id, data FROM records WHERE collection = ? AND id IN (${ids.map(() => "?").join(", ")})`
  )
    .bind(collection, ...ids)
    .all();
  return new Map((result.results || []).map((row) => [row.id, row.data]));
};

export const applyStockChanges = async (
  env,
  { lines, reason, note = "", reference = null, actor = null, record = null }
) => {
  const merged = mergeChanges(lines);
  const ids = [...merged.keys()];

  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const rawProducts = await loadRows(env, "products", ids);
    const products = new Map([...rawProducts].map(([id, data]) => [id, JSON.parse(data)]));
    const plans = planStockChanges(merged, products);

    let rawRecord = null;
    let current = null;
    if (record) {
      rawRecord = (await loadRows(env, record.collection, [record.id])).get(record.id);
      if (!rawRecord) notFound(notFoundMessage(record.collection));
      current = JSON.parse(rawRecord);
      if (!matchesExpect(current, record.expect)) throw new ApiError(409, CHANGED_ELSEWHERE);
    }
    if (!plans.length && !record) return { plans, movements: [], record: null };

    const timestamp = new Date().toISOString();
    const statements = [];
    for (const plan of plans) {
      const raw = rawProducts.get(plan.product.id);
      plan.product = { ...plan.product, stockQuantity: plan.after, updatedAt: timestamp };
      statements.push(
        env.DB.prepare(
          "UPDATE records SET data = ?, updated_at = ? WHERE collection = 'products' AND id = ? AND data = ?"
        ).bind(JSON.stringify(plan.product), timestamp, plan.product.id, raw),
        env.DB.prepare(GUARD)
      );
    }

    const movements = plans.map((plan) =>
      buildMovement(plan, { id: crypto.randomUUID(), reason, note, reference, actor, timestamp })
    );
    for (const movement of movements) {
      statements.push(
        env.DB.prepare(
          `INSERT INTO records (id, collection, slug, data, is_active, sort_order, created_at, updated_at)
            VALUES (?, 'inventoryMovements', NULL, ?, 1, 0, ?, ?)`
        ).bind(movement.id, JSON.stringify(movement), timestamp, timestamp)
      );
    }

    let updatedRecord = null;
    if (record) {
      updatedRecord = {
        ...current,
        ...withoutUndefined(record.patch),
        id: current.id,
        createdAt: current.createdAt,
        updatedAt: timestamp,
      };
      const [slug, isActive, sortOrder] = rowValues(updatedRecord);
      statements.push(
        env.DB.prepare(
          `UPDATE records SET data = ?, slug = ?, is_active = ?, sort_order = ?, updated_at = ?
            WHERE collection = ? AND id = ? AND data = ?`
        ).bind(JSON.stringify(updatedRecord), slug, isActive, sortOrder, timestamp, record.collection, current.id, rawRecord),
        env.DB.prepare(GUARD)
      );
    }
    statements.push(env.DB.prepare("DELETE FROM batch_guard"));

    try {
      await env.DB.batch(statements);
      return { plans, movements, record: updatedRecord };
    } catch (error) {
      if (!isGuardFailure(error)) throw error;
      // A product or the record changed between read and write: retry on fresh rows.
    }
  }
  throw new ApiError(409, CHANGED_ELSEWHERE);
};
