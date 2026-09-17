-- v3 settings and notifications (BE-2, API_CONTRACT_V3 §8 and §10). Idempotent.
-- Settings are one record (collection 'settings', id 'global'); no index is needed.

-- Notification list and 90-day retention cleanup, newest first.
CREATE INDEX IF NOT EXISTS idx_records_notifications_created
  ON records (collection, created_at)
  WHERE collection = 'notifications';

-- Per-admin read rows ("<adminId>:<notificationId>" and the "<adminId>:*" watermark).
CREATE INDEX IF NOT EXISTS idx_records_notification_reads_admin
  ON records (json_extract(data, '$.adminId'))
  WHERE collection = 'notificationReads';
