// Rich-text sanitiser fixtures (API_CONTRACT_V3 §0.5), Worker suite: the module the Worker
// bundles (backend/shared/richText.js) against the shared fixtures.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { sanitizeRichText } from "../../shared/richText.js";

const fixtures = JSON.parse(readFileSync(new URL("../../shared/__fixtures__/richText.json", import.meta.url), "utf8"));

test("Worker: rich-text fixtures", () => {
  for (const { name, input, output } of fixtures) assert.equal(sanitizeRichText(input), output, name);
});
