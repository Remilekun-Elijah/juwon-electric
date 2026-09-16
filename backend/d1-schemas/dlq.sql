-- D1 schema for DLQ (failed writes)

CREATE TABLE IF NOT EXISTS d1_dlq (
  id TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  first_failed_at TEXT,
  last_failed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_dlq_first_failed_at ON d1_dlq(first_failed_at);
