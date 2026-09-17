// Express <-> Worker parity for the catalog (API_CONTRACT_V3 §11): the same scenario
// against both runtimes, statuses and bodies deep-compared after masking ids and timestamps.
import { after, test } from "node:test";
import { runCatalogScenario } from "../scenarios/catalog.js";
import { assertParity, expressOpsClient, workerOpsClient } from "../scenarios/opsKit.js";

const express = await expressOpsClient();
const worker = await workerOpsClient();
after(() => Promise.all([express.close(), worker.close()]));

test("catalog: Express and Worker return the same statuses and bodies", async () => {
  assertParity(await runCatalogScenario(express), await runCatalogScenario(worker));
});
