// Express <-> Worker parity helpers (API_CONTRACT_V3 §11): the same request script against
// both runtimes, with status and body deep-compared after masking ids, timestamps and tokens.
import assert from "node:assert/strict";
import { createWorkerClient } from "../../cloudflare/test/helpers/worker.js";
import { startExpress } from "./express.js";

const MASKED_KEYS = new Set([
  "id",
  "entityId",
  "token",
  "resetToken",
  "createdAt",
  "updatedAt",
  "lastLoginAt",
  "expiresAt",
  "postedAt",
  "closedAt",
]);

/** Replaces non-null values of id/timestamp/token keys with placeholders (null stays null). */
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

/** Runs `scenario(request)` against Express and the Worker and compares the transcripts. */
export const assertParity = async (scenario, env) => {
  const express = await startExpress(env);
  let expressTranscript;
  try {
    expressTranscript = await scenario(express.request);
  } finally {
    await express.close();
  }
  const workerTranscript = await scenario(createWorkerClient(env).request);

  assert.equal(workerTranscript.length, expressTranscript.length);
  expressTranscript.forEach((step, index) => {
    const other = workerTranscript[index];
    assert.equal(other.label, step.label);
    assert.deepEqual(
      { status: other.status, body: mask(other.body) },
      { status: step.status, body: mask(step.body) },
      `parity mismatch at "${step.label}"`
    );
  });
};
