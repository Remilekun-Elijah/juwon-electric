// Express <-> Worker parity for Commerce v2 (docs/agents/COMMERCE_V2.md §2.3).
import { after, test } from "node:test";
import { runCommerceScenario } from "../scenarios/commerce.js";
import { assertParity, expressOpsClient, workerOpsClient } from "../scenarios/opsKit.js";

const express = await expressOpsClient();
const worker = await workerOpsClient();
after(() => Promise.all([express.close(), worker.close()]));

test("commerce: Express and Worker return the same statuses and bodies", async () => {
  assertParity(await runCommerceScenario(express), await runCommerceScenario(worker));
});
