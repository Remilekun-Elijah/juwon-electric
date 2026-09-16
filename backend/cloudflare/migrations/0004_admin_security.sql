-- Admin security tables used by the Worker (src/auth.js, src/audit.js, webhook replay protection).
-- Times stored as INTEGER are Unix epoch milliseconds; audit_logs.created_at is an ISO-8601 string.

-- One row per admin login. Tokens carry the session id (sid); a token is only
-- accepted while its session exists, is not revoked and has not expired.
CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  revoked_at INTEGER,
  ip TEXT,
  user_agent TEXT
);

-- "Revoke all sessions for this admin" (password reset).
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id
  ON admin_sessions (admin_id);

-- Opportunistic cleanup of expired sessions.
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at
  ON admin_sessions (expires_at);

-- Failed sign-ins per normalized email (whether or not the account exists).
-- 5 failures inside a 15 minute window lock the email for 15 minutes.
CREATE TABLE IF NOT EXISTS login_failures (
  email TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL,
  locked_until INTEGER
);

CREATE INDEX IF NOT EXISTS idx_login_failures_window_start
  ON login_failures (window_start);

-- Admin audit trail. changes is a JSON array of field names (never values).
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  admin_id TEXT,
  admin_email TEXT,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  summary TEXT,
  changes TEXT NOT NULL DEFAULT '[]',
  ip TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs (created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created_at
  ON audit_logs (action, created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_created_at
  ON audit_logs (entity, created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id_created_at
  ON audit_logs (admin_id, created_at);

-- Processed inbound webhook ids (svix-id), kept 24 hours to reject replays.
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  received_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_received_at
  ON webhook_events (received_at);
