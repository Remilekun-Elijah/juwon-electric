-- v3 inventory and installation jobs (BE-2, API_CONTRACT_V3 §5, §7 and §10).
-- Idempotent: safe to apply more than once.

-- Guard rows for all-or-nothing batches (src/ops/stock.js). After each compare-and-set
-- UPDATE, a guard statement inserts changes(). A value of 0 violates the CHECK and rolls
-- back the whole batch, which then retries against fresh rows. Every batch ends by
-- deleting its guard rows, so the table is always empty between batches.
CREATE TABLE IF NOT EXISTS batch_guard (
  ok INTEGER NOT NULL CHECK (ok = 1)
);

-- Movement history per product and per order reference, newest first.
CREATE INDEX IF NOT EXISTS idx_records_movements_product
  ON records (json_extract(data, '$.productId'), created_at)
  WHERE collection = 'inventoryMovements';

CREATE INDEX IF NOT EXISTS idx_records_movements_reference
  ON records (json_extract(data, '$.referenceId'))
  WHERE collection = 'inventoryMovements';

-- Installation jobs by order and by engineer.
CREATE INDEX IF NOT EXISTS idx_records_jobs_order
  ON records (json_extract(data, '$.orderId'))
  WHERE collection = 'installationJobs';

CREATE INDEX IF NOT EXISTS idx_records_jobs_engineer
  ON records (json_extract(data, '$.engineerId'))
  WHERE collection = 'installationJobs';
