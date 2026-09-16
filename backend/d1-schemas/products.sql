-- D1 schema for products (Cloudflare D1)

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  category_id TEXT,
  price REAL,
  stock_quantity INTEGER,
  description_html TEXT,
  images_json TEXT,
  attributes_json TEXT,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
