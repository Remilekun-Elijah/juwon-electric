// Express <-> Worker parity for dashboard KPIs (API_CONTRACT_V3 §11).
import { after, test } from "node:test";
import { runDashboardScenario } from "../scenarios/dashboard.js";
import { assertParity, expressOpsClient, workerOpsClient } from "../scenarios/opsKit.js";

const express = await expressOpsClient();
const worker = await workerOpsClient();
after(() => Promise.all([express.close(), worker.close()]));

test("dashboard: Express and Worker return the same KPIs", async () => {
  assertParity(await runDashboardScenario(express), await runDashboardScenario(worker));
});
