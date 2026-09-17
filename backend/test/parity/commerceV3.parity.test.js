// Express <-> Worker parity for Commerce v3 (docs/agents/COMMERCE_V3.md §7).
import { after, test } from "node:test";
import { runCommerceV3Scenario } from "../scenarios/commerceV3.js";
import { assertParity, expressOpsClient, workerOpsClient } from "../scenarios/opsKit.js";

const express = await expressOpsClient();
const worker = await workerOpsClient();
after(() => Promise.all([express.close(), worker.close()]));

test("commerce v3: Express and Worker return the same statuses and bodies", async () => {
  assertParity(await runCommerceV3Scenario(express), await runCommerceV3Scenario(worker));
});
