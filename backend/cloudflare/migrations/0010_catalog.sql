-- v3 catalog (BE-2, API_CONTRACT_V3 §4 and §10): categories and products live in `records`
-- as JSON documents (collections 'categories' and 'products').
-- Idempotent: safe to apply more than once. These collections are new, so there are no
-- existing rows to deduplicate. If an index cannot be created because of duplicates, the
-- migration fails loudly and no data is changed.

-- Slugs are unique per collection (the API also suffixes -2, -3, ... before writing;
-- the index catches concurrent writes).
CREATE UNIQUE INDEX IF NOT EXISTS idx_records_products_slug
  ON records (slug)
  WHERE collection = 'products';

CREATE UNIQUE INDEX IF NOT EXISTS idx_records_categories_slug
  ON records (slug)
  WHERE collection = 'categories';

-- SKU is unique case-insensitively. The SKU is stored as sent.
CREATE UNIQUE INDEX IF NOT EXISTS idx_records_products_sku
  ON records (lower(json_extract(data, '$.sku')))
  WHERE collection = 'products';
