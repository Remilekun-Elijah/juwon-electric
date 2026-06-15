CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,
  collection TEXT NOT NULL,
  slug TEXT,
  data TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_records_collection_sort
  ON records (collection, sort_order, created_at);

CREATE INDEX IF NOT EXISTS idx_records_collection_slug
  ON records (collection, slug);

CREATE INDEX IF NOT EXISTS idx_records_collection_active
  ON records (collection, is_active);
