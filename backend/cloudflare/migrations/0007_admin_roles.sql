-- Admin roles and admin email uniqueness (API_CONTRACT_V3 §1.1, §10; owner BE-1).
-- Idempotent: safe to apply more than once. Admins live in records (collection 'admins').
-- Roles: superadmin, admin, inventory, sales, engineer, hr, support (backend/shared/capabilities.js).

-- The seeders stored "super_admin"; the canonical name is "superadmin".
UPDATE records
  SET data = json_set(data, '$.role', 'superadmin')
  WHERE collection = 'admins'
    AND json_extract(data, '$.role') = 'super_admin';

-- One account per email, case-insensitively. If existing rows share an email this
-- statement fails and the migration aborts: resolve the duplicates by hand first
-- (nothing is deleted here).
CREATE UNIQUE INDEX IF NOT EXISTS idx_records_admins_email
  ON records (lower(json_extract(data, '$.email')))
  WHERE collection = 'admins';
