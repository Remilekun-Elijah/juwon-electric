-- Round 2 hardening (fix plan C4). Idempotent: safe to apply more than once.
-- Times are Unix epoch milliseconds.

-- Inbound webhook claims (replaces webhook_events, which is no longer written).
-- status: 'processing' while a delivery is being handled, 'done' once recorded or ignored.
-- claim_token identifies the request that owns a 'processing' claim, so only that request
-- can complete or release it. A 'processing' claim older than 2 minutes can be taken over.
CREATE TABLE IF NOT EXISTS webhook_claims (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('processing', 'done')),
  claim_token TEXT NOT NULL,
  claimed_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_claims_updated_at
  ON webhook_claims (updated_at);

-- Carry over deliveries already processed under 0004, so they stay de-duplicated.
INSERT OR IGNORE INTO webhook_claims (id, status, claim_token, claimed_at, updated_at)
  SELECT id, 'done', 'migrated', received_at, received_at FROM webhook_events;

-- Note: login_failures (0004) now holds attempt counters under composite keys
-- ("pair:<email>|<ip prefix>", "email:<email>"), and rate_limits (0002) uses new key
-- names. Old rows are simply never read again and expire on their own.

-- Newest-first lookups by collection (contacts by email, reset tokens, carts by session).
CREATE INDEX IF NOT EXISTS idx_records_collection_created
  ON records (collection, created_at);
