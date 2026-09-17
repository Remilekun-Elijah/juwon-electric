// Express <-> Worker parity for installation jobs and staff (API_CONTRACT_V3 §11).
import { after, test } from "node:test";
import { runJobsScenario } from "../scenarios/jobs.js";
import { assertParity, expressOpsClient, workerOpsClient } from "../scenarios/opsKit.js";

const express = await expressOpsClient();
const worker = await workerOpsClient();
after(() => Promise.all([express.close(), worker.close()]));

test("jobs: Express and Worker return the same statuses and bodies", async () => {
  assertParity(await runJobsScenario(express), await runJobsScenario(worker));
});
