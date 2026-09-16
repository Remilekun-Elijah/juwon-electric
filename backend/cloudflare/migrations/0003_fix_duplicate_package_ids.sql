-- Give packages that shared a public id (legacyId) with another package a
-- unique id. The first package with each id keeps it; the second one moves to
-- a new id, matching frontend/src/utils/plans.json and seed.sql.
--
--   record id                               old -> new  package
--   dce832cb-7fa7-4b97-a431-065908cfaabd      7 -> 135  tubular Premium 3.5 kVA
--   417baefc-8baa-414c-8730-0f2b4df3eaed     57 -> 136  hybrid lithium Diamond 20 kVA
--   531238ad-0e1d-483c-a835-b6a3cf06c81d     56 -> 137  hybrid lithium Diamond 30 kVA
--
-- Idempotent: each row changes only while it still has its old id, so running
-- this again (or after a reseed) does nothing. Package rows have no other
-- field that copies the public id (`id` is the record uuid).

UPDATE records
SET data = json_set(data, '$.legacyId', 135, '$.updatedAt', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 'dce832cb-7fa7-4b97-a431-065908cfaabd'
  AND collection = 'packages'
  AND CAST(json_extract(data, '$.legacyId') AS TEXT) = '7';

UPDATE records
SET data = json_set(data, '$.legacyId', 136, '$.updatedAt', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = '417baefc-8baa-414c-8730-0f2b4df3eaed'
  AND collection = 'packages'
  AND CAST(json_extract(data, '$.legacyId') AS TEXT) = '57';

UPDATE records
SET data = json_set(data, '$.legacyId', 137, '$.updatedAt', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = '531238ad-0e1d-483c-a835-b6a3cf06c81d'
  AND collection = 'packages'
  AND CAST(json_extract(data, '$.legacyId') AS TEXT) = '56';
