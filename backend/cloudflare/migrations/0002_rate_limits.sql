-- Fixed-window rate limit counters used by the Worker (see enforceRateLimit in src/index.js).
-- key: "<limit name>:<client ip>[:<email>]", count: requests in the current window,
-- reset_at: window end as Unix epoch milliseconds.
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  reset_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at
  ON rate_limits (reset_at);
