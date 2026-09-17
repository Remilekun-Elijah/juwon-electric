-- Vacancies module (API_CONTRACT_V3 §3, §10; owner BE-1). Idempotent: safe to apply more than once.
-- Vacancies live in records (collection 'vacancies'). The slug column holds the vacancy slug.
-- Replaces the retired workers/d1-write + backend/d1-schemas/vacancies.sql design; rows in a
-- manually created standalone `vacancies` table (if any) are not copied.

-- Slugs are unique across all vacancies. Delete is a hard delete, so a deleted slug is free.
-- If existing rows share a slug this statement fails and the migration aborts (nothing is deleted).
CREATE UNIQUE INDEX IF NOT EXISTS idx_records_vacancies_slug
  ON records (slug)
  WHERE collection = 'vacancies';

-- Public list (status = 'open') and the admin status filter.
CREATE INDEX IF NOT EXISTS idx_records_vacancies_status
  ON records (json_extract(data, '$.status'))
  WHERE collection = 'vacancies';
