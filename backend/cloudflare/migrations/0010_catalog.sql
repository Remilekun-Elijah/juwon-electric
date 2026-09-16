-- v3 catalog (BE-2): categories and products live in `records` as JSON documents
-- (collections 'categories' and 'products'). Idempotent: safe to apply more than once.
-- Migration numbers 0007-0009 are reserved for BE-1 (roles, vacancies).

-- SKU is unique across products (stored upper-case by the API).
CREATE UNIQUE INDEX IF NOT EXISTS idx_records_products_sku
  ON records (json_extract(data, '$.sku'))
  WHERE collection = 'products';

-- Slugs are unique per collection for categories and products (the API also suffixes
-- -2, -3, ... before inserting; the index catches concurrent writes).
CREATE UNIQUE INDEX IF NOT EXISTS idx_records_catalog_slug
  ON records (collection, slug)
  WHERE collection IN ('categories', 'products') AND slug IS NOT NULL;
