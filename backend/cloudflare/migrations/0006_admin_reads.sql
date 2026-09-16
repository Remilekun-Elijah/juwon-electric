-- Per-admin read status for admin messages (contacts) and orders.
-- Idempotent: safe to apply more than once. Times are Unix epoch milliseconds.
-- Read status never touches the records themselves.

-- One row per admin. Everything with activity at or before `since` counts as read.
-- admin_id is the admin record id, or "static-token" for ADMIN_TOKEN requests.
CREATE TABLE IF NOT EXISTS admin_read_state (
  admin_id TEXT PRIMARY KEY,
  since INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Records read after `since`. record_key is "<contacts|orders>:<record id>".
-- A record counts as read while read_at >= its latest activity.
CREATE TABLE IF NOT EXISTS admin_reads (
  admin_id TEXT NOT NULL,
  record_key TEXT NOT NULL,
  read_at INTEGER NOT NULL,
  PRIMARY KEY (admin_id, record_key)
);

-- Removing a deleted record's rows for every admin.
CREATE INDEX IF NOT EXISTS idx_admin_reads_record_key
  ON admin_reads (record_key);
