import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(__dirname, "../..");
const sourcePath = resolve(backendRoot, "data/db.json");
const outputPath = resolve(__dirname, "../seed.sql");

const sqlString = (value) =>
  `'${String(value ?? "").replaceAll("'", "''")}'`;

const rowSql = (collection, item, index) => {
  const now = new Date().toISOString();
  const data = {
    ...item,
    id: String(item.id),
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || now,
  };

  return [
    "INSERT OR REPLACE INTO records",
    "(id, collection, slug, data, is_active, sort_order, created_at, updated_at)",
    "VALUES",
    `(${sqlString(data.id)}, ${sqlString(collection)}, ${sqlString(data.slug)}, ${sqlString(JSON.stringify(data))}, ${data.isActive === false ? 0 : 1}, ${Number(data.sortOrder || index + 1)}, ${sqlString(data.createdAt)}, ${sqlString(data.updatedAt)});`,
  ].join(" ");
};

const db = JSON.parse(await readFile(sourcePath, "utf8"));
const collections = [
  "packages",
  "services",
  "customerSegments",
  "portfolio",
];

const statements = [
  "-- Generated from backend/data/db.json",
  "-- Apply with: wrangler d1 execute juwon-electric --remote --file backend/cloudflare/seed.sql",
  ...collections.flatMap((collection) =>
    (db[collection] || []).map((item, index) => rowSql(collection, item, index))
  ),
  "",
];

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, statements.join("\n"));
console.log(`Seed SQL written to ${outputPath}`);
