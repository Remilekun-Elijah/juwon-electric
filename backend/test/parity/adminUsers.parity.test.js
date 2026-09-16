// Express <-> Worker parity (API_CONTRACT_V3 §11): the same request script against
// both runtimes, with status and body deep-compared after masking ids, timestamps
// and tokens.
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createWorkerClient } from "../../cloudflare/test/helpers/worker.js";
import { startExpress } from "../helpers/express.js";
import { TEST_ENV, runAdminUsersScenario } from "../scenarios/adminUsers.js";

const MASKED_KEYS = new Set(["id", "entityId", "token", "resetToken", "createdAt", "updatedAt", "lastLoginAt", "expiresAt"]);

export const mask = (value) => {
  if (Array.isArray(value)) return value.map(mask);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      MASKED_KEYS.has(key) && entry !== null && entry !== undefined ? `<${key}>` : mask(entry),
    ])
  );
};

let express;
after(async () => {
  await express?.close();
});

test("admin users: Express and Worker return the same statuses and bodies", async () => {
  express = await startExpress(TEST_ENV);
  const expressTranscript = await runAdminUsersScenario(express.request);
  const workerTranscript = await runAdminUsersScenario(createWorkerClient(TEST_ENV).request);

  assert.equal(workerTranscript.length, expressTranscript.length);
  expressTranscript.forEach((step, index) => {
    const other = workerTranscript[index];
    assert.equal(other.label, step.label);
    assert.deepEqual(
      { status: other.status, body: mask(other.body) },
      { status: step.status, body: mask(step.body) },
      `parity mismatch at "${step.label}" (${step.method} ${step.path})`
    );
  });
});
