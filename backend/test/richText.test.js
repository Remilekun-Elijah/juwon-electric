// Contract §0.5 fixture suite, through the module path Express uses.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { sanitizeRichText } from "../shared/richText.js";

const fixtures = JSON.parse(readFileSync(new URL("../shared/__fixtures__/richText.json", import.meta.url), "utf8"));

test("rich text fixtures (Express)", () => {
  assert.ok(fixtures.length >= 10);
  for (const { name, input, output } of fixtures) {
    assert.equal(sanitizeRichText(input), output, name);
  }
});

test("sanitiser output is stable (sanitising twice changes nothing)", () => {
  for (const { name, output } of fixtures) {
    assert.equal(sanitizeRichText(output), output, name);
  }
});

// Review L7: the Worker has a tight CPU budget. 100 KB of pathological markup must stay
// far below 50 ms (about 5-10 ms locally). The best of 3 runs is used to ignore GC noise.
const KB100 = 100 * 1024;
const fill = (unit) => unit.repeat(Math.ceil(KB100 / unit.length)).slice(0, KB100);
const PATHOLOGICAL = {
  "repeated <a": fill("<a"),
  "unclosed double-quoted attributes": fill('<a "'),
  "unclosed single-quoted attributes": fill("<p title='x"),
  "nested <": fill("<<a<b "),
  "bare <": fill("<"),
  "mixed quotes": fill(`<a '"`),
  "deep nesting then stray closers": fill("<b>").slice(0, KB100 / 2) + fill("</i>").slice(0, KB100 / 2),
  "unterminated comments": fill("<!--"),
  "ampersands": fill("&"),
  "long quoted value": `<a href="${"x".repeat(KB100)}`,
};

test("100 KB of pathological input sanitises in well under 50 ms", () => {
  for (const [name, input] of Object.entries(PATHOLOGICAL)) {
    let best = Infinity;
    for (let run = 0; run < 3; run += 1) {
      const started = process.hrtime.bigint();
      sanitizeRichText(input);
      best = Math.min(best, Number(process.hrtime.bigint() - started) / 1e6);
    }
    assert.ok(best < 50, `${name}: ${best.toFixed(1)} ms`);
  }
});

test("nesting deeper than 100 levels is unwrapped and the output stays well-formed", () => {
  const output = sanitizeRichText(`${"<b>".repeat(150)}deep${"</b>".repeat(150)}`);
  assert.equal(output, `${"<b>".repeat(100)}deep${"</b>".repeat(100)}`);
});
