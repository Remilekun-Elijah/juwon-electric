// Express <-> Worker parity for Landing v1 (docs/agents/LANDING_V1.md §8).
import { after, test } from "node:test";
import { runLandingScenario } from "../scenarios/landing.js";
import { assertParity, expressOpsClient, workerOpsClient } from "../scenarios/opsKit.js";

const express = await expressOpsClient();
const worker = await workerOpsClient();
after(() => Promise.all([express.close(), worker.close()]));

test("landing: Express and Worker return the same statuses and bodies", async () => {
  assertParity(await runLandingScenario(express), await runLandingScenario(worker));
});
