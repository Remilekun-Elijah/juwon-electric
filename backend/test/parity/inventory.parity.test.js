// Express <-> Worker parity for inventory (API_CONTRACT_V3 §11).
import { after, test } from "node:test";
import { runInventoryScenario } from "../scenarios/inventory.js";
import { assertParity, expressOpsClient, workerOpsClient } from "../scenarios/opsKit.js";

const express = await expressOpsClient();
const worker = await workerOpsClient();
after(() => Promise.all([express.close(), worker.close()]));

test("inventory: Express and Worker return the same statuses and bodies", async () => {
  assertParity(await runInventoryScenario(express), await runInventoryScenario(worker));
});
