-- v3 order fulfilment backfill (BE-2, API_CONTRACT_V3 §6.1). Idempotent: every statement
-- only touches orders that have no fulfillmentStatus yet, and the last statement sets it.
-- The Express runtime applies the same rules at read time (backend/shared/orders.js
-- orderBackfill), so orders serialise identically before and after this migration.
--
--   paymentStatus: unpaid -> pending (legacyPaymentStatus "unpaid"); partial, paid, refunded,
--                  pending and failed are kept; missing or other -> pending, with
--                  legacyPaymentStatus set to the original value (or null)
--   status:        completed -> fulfillmentStatus delivered; cancelled -> cancelled;
--                  anything else -> pending. status is rewritten as the derived value.
--   defaults:      requiresInstallation false; assignedEngineerId, paidAt and
--                  stockCommittedAt null (only when absent).

UPDATE records
SET data = json_set(data, '$.paymentStatus', 'pending', '$.legacyPaymentStatus', 'unpaid')
WHERE collection = 'orders'
  AND json_extract(data, '$.fulfillmentStatus') IS NULL
  AND json_extract(data, '$.paymentStatus') = 'unpaid';

UPDATE records
SET data = json_set(data, '$.legacyPaymentStatus', json_extract(data, '$.paymentStatus'), '$.paymentStatus', 'pending')
WHERE collection = 'orders'
  AND json_extract(data, '$.fulfillmentStatus') IS NULL
  AND (
    json_type(data, '$.paymentStatus') IS NOT 'text'
    OR json_extract(data, '$.paymentStatus') NOT IN ('pending', 'partial', 'paid', 'failed', 'refunded')
  );

UPDATE records
SET data = json_set(data, '$.requiresInstallation', json('false'))
WHERE collection = 'orders'
  AND json_extract(data, '$.fulfillmentStatus') IS NULL
  AND COALESCE(json_type(data, '$.requiresInstallation'), '') NOT IN ('true', 'false');

UPDATE records
SET data = json_insert(data, '$.assignedEngineerId', NULL, '$.paidAt', NULL, '$.stockCommittedAt', NULL)
WHERE collection = 'orders'
  AND json_extract(data, '$.fulfillmentStatus') IS NULL;

UPDATE records
SET data = json_set(
  data,
  '$.fulfillmentStatus',
  CASE json_extract(data, '$.status') WHEN 'completed' THEN 'delivered' WHEN 'cancelled' THEN 'cancelled' ELSE 'pending' END,
  '$.status',
  CASE json_extract(data, '$.status') WHEN 'completed' THEN 'completed' WHEN 'cancelled' THEN 'cancelled' ELSE 'pending' END
)
WHERE collection = 'orders'
  AND json_extract(data, '$.fulfillmentStatus') IS NULL;
