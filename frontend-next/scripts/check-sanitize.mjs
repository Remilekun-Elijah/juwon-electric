// Checks lib/sanitize.ts: the shared rich-text fixtures (when backend/shared is present, e.g. on the integration
// branch) and linear-time behaviour on 100 KB pathological inputs (each must finish in under 50 ms).
// Run: npm run check:sanitize (Node 22.18+ strips the types from lib/sanitize.ts).
import fs from "node:fs";
import { sanitizeRichText } from "../lib/sanitize.ts";

const LIMIT_MS = 50;
const SIZE = 100_000;
let failed = 0;

const fixturesUrl = new URL("../../backend/shared/__fixtures__/richText.json", import.meta.url);
if (fs.existsSync(fixturesUrl)) {
  const fixtures = JSON.parse(fs.readFileSync(fixturesUrl, "utf8"));
  for (const { name, input, output } of fixtures) {
    const actual = sanitizeRichText(input);
    if (actual !== output) {
      failed += 1;
      console.log(`FAIL fixture "${name}"\n  expected ${JSON.stringify(output)}\n  actual   ${JSON.stringify(actual)}`);
    }
  }
  console.log(`fixtures: ${fixtures.length - failed}/${fixtures.length} pass`);
} else {
  console.log("fixtures: backend/shared/__fixtures__/richText.json not found, skipped");
}

const repeat = (unit) => unit.repeat(Math.floor(SIZE / unit.length));
const pathological = {
  "unclosed <a": repeat("<a "),
  "unterminated quotes": repeat('<a href="'),
  "nested open tags": repeat("<p><strong>"),
  "runs of <": repeat("<"),
  "tag-like without >": repeat("<a b=c "),
  "alternating quotes": repeat(`<a x='">`),
  "deep nesting": repeat("<blockquote>"),
  "unclosed drop tags": repeat("<script>"),
  "comment openers": repeat("<!--"),
  "entities": repeat("&amp;&#x6a;&bogus"),
};
for (const [name, input] of Object.entries(pathological)) {
  sanitizeRichText(input); // warm up the JIT
  const start = performance.now();
  sanitizeRichText(input);
  const ms = performance.now() - start;
  const ok = ms < LIMIT_MS;
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${input.length} chars in ${ms.toFixed(1)} ms`);
}

process.exit(failed ? 1 : 0);
