// Checklist C1/C2: retired code stays gone and nothing references it.
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const backend = fileURLToPath(new URL("..", import.meta.url));
const repo = join(backend, "..");

const REMOVED = [
  "workers/d1-write",
  "backend/d1-sync",
  "backend/d1-schemas",
  "backend/models",
  "backend/routes/user.js",
  "backend/controllers/user.js",
  "backend/routes/vacancies.js",
  "backend/middleware/auth.js",
  "backend/TODO_SANITIZE.md",
];

const sourceFiles = (dir) =>
  readdirSync(dir).flatMap((name) => {
    if (name === "node_modules" || name.startsWith(".")) return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(c|m)?js$/.test(name) ? [path] : [];
  });

test("retired modules are removed", () => {
  for (const path of REMOVED) assert.equal(existsSync(join(repo, path)), false, path);
});

test("no backend source imports retired modules or client role headers", () => {
  const forbidden = [
    /from\s+["'][^"']*\/models\//,
    /from\s+["'][^"']*routes\/user\.js/,
    /from\s+["'][^"']*middleware\/auth\.js/,
    /from\s+["']sanitize-html["']/,
    /X-User-(Role|Id)["']\)/i,
  ];
  for (const file of sourceFiles(backend).filter((path) => !path.includes(`${join("backend", "test")}`))) {
    const text = readFileSync(file, "utf8");
    for (const pattern of forbidden) assert.doesNotMatch(text, pattern, `${file}: ${pattern}`);
  }
});

test("sanitize-html is no longer a dependency", () => {
  const pkg = JSON.parse(readFileSync(join(backend, "package.json"), "utf8"));
  assert.equal(pkg.dependencies["sanitize-html"], undefined);
});
