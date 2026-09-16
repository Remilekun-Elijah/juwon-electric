-- D1 schema for vacancies (Cloudflare D1)

CREATE TABLE IF NOT EXISTS vacancies (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  department TEXT,
  location TEXT,
  employment_type TEXT,
  salary_range TEXT,
  description_html TEXT,
  requirements_json TEXT,
  responsibilities_json TEXT,
  status TEXT,
  posted_by TEXT,
  posted_at TEXT,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_vacancies_slug ON vacancies(slug);
CREATE INDEX IF NOT EXISTS idx_vacancies_status ON vacancies(status);
