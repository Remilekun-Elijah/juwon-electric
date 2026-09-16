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

test("hostile input is handled in linear time", () => {
  const inputs = ["<a ".repeat(30000), "<".repeat(90000), `<p title="${"x".repeat(90000)}`, "<!--".repeat(20000), "&".repeat(90000)];
  for (const input of inputs) {
    const started = Date.now();
    sanitizeRichText(input);
    assert.ok(Date.now() - started < 1500, `slow on ${input.slice(0, 12)}...`);
  }
});
