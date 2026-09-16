// Guards against invisible control/format characters in source (they break regex
// literals and hide in reviews). Tabs and newlines are the only allowed ones.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIRECTORIES = ["shared", "cloudflare/src", "cloudflare/migrations", "controllers", "routes", "middleware", "services", "test"];
const INVISIBLE = new RegExp("[\\p{Cc}\\p{Cf}]", "gu");

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return /\.(js|mjs|sql)$/.test(name) ? [path] : [];
  });

test("source files contain no control or format characters", () => {
  const findings = [];
  for (const file of DIRECTORIES.flatMap((dir) => walk(join(ROOT, dir)))) {
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, index) => {
        for (const match of line.matchAll(INVISIBLE)) {
          if (match[0] === "\t" || match[0] === "\r") continue;
          findings.push(`${relative(ROOT, file)}:${index + 1} U+${match[0].codePointAt(0).toString(16).padStart(4, "0")}`);
        }
      });
  }
  assert.deepEqual(findings, []);
});
