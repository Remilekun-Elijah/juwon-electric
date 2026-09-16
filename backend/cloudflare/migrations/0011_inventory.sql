-- v3 inventory (BE-2). Idempotent: safe to apply more than once.

-- Guard rows for all-or-nothing batches (src/ops/stock.js). Each guard inserts changes()
-- of the previous compare-and-set UPDATE; 0 violates the CHECK and rolls the batch back.
-- Every batch ends by deleting its rows, so the table is always empty between batches.
CREATE TABLE IF NOT EXISTS batch_guard (
  ok INTEGER NOT NULL CHECK (ok = 1)
);

-- Movement history per product, newest first.
CREATE INDEX IF NOT EXISTS idx_records_movements_product
  ON records (json_extract(data, '$.productId'), created_at)
  WHERE collection = 'inventoryMovements';
