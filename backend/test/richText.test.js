// Rich-text sanitiser fixtures (API_CONTRACT_V3 §0.5), Express suite. The Worker suite runs
// the same fixtures in backend/cloudflare/test/richText.test.js.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { sanitizeRichText } from "../shared/richText.js";

const fixtures = JSON.parse(readFileSync(new URL("../shared/__fixtures__/richText.json", import.meta.url), "utf8"));

for (const { name, input, output } of fixtures) {
  test(`richText: ${name}`, () => {
    assert.equal(sanitizeRichText(input), output);
  });
}

test("richText: output is stable when sanitised again", () => {
  for (const { output } of fixtures) assert.equal(sanitizeRichText(output), output);
});

test("richText: no script tags or event handler attributes survive", () => {
  const nasty = [
    "<scr<script>ipt>alert(1)</script>",
    '<a href="https://ok.test" onmouseover=alert(1)>x</a>',
    "<p title='\" onclick=alert(1) x=\"'>t</p>",
    '<a href="https://ok.test" title="x" onclick="y">z</a>',
  ];
  for (const input of nasty) {
    const output = sanitizeRichText(input);
    assert.doesNotMatch(output, /<script/i, input);
    // Quoted values are escaped text; handlers must not appear as attributes.
    assert.doesNotMatch(output.replace(/"[^"]*"/g, '""'), /<[^>]+\son\w+=/i, input);
  }
});
