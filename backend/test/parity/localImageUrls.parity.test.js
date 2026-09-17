// Express <-> Worker parity for local http image URLs (UPLOADS_V1 integration decision).
import { after, test } from "node:test";
import { runLocalImageUrlsScenario } from "../scenarios/localImageUrls.js";
import { assertParity, expressOpsClient, workerOpsClient } from "../scenarios/opsKit.js";

const express = await expressOpsClient();
const worker = await workerOpsClient();
after(() => Promise.all([express.close(), worker.close()]));

test("local image URLs: Express and Worker return the same statuses and bodies", async () => {
  assertParity(await runLocalImageUrlsScenario(express), await runLocalImageUrlsScenario(worker));
});
