// Express <-> Worker parity for orders and fulfilment (API_CONTRACT_V3 §11).
import { after, test } from "node:test";
import { runOrdersScenario } from "../scenarios/orders.js";
import { assertParity, expressOpsClient, workerOpsClient } from "../scenarios/opsKit.js";

const express = await expressOpsClient();
const worker = await workerOpsClient();
after(() => Promise.all([express.close(), worker.close()]));

test("orders: Express and Worker return the same statuses and bodies", async () => {
  assertParity(await runOrdersScenario(express), await runOrdersScenario(worker));
});
