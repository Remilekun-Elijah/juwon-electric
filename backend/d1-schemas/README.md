D1 schema migrations

This folder contains SQL schema files to create the Cloudflare D1 tables used as the primary operational DB for the platform. Apply these using wrangler or via the D1 dashboard.

Files:
- vacancies.sql — table and indexes for public vacancies
- products.sql — table and indexes for public products

Notes:
- Use ISO8601 strings for posted_at / updated_at fields.
- Keep records denormalized for fast reads at the edge.
