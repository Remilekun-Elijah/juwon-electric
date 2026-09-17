// Express <-> Worker parity for image uploads (docs/agents/UPLOADS_V1.md §8).
import { after, test } from "node:test";
import { R2Stub } from "../../cloudflare/test/helpers/r2.js";
import { UPLOADS_ENV, runUploadsScenario } from "../scenarios/uploads.js";
import { assertParity, expressOpsClient, workerOpsClient } from "../scenarios/opsKit.js";

const express = await expressOpsClient(UPLOADS_ENV);
const worker = await workerOpsClient({ ...UPLOADS_ENV, IMAGES: new R2Stub() });
after(() => Promise.all([express.close(), worker.close()]));

test("uploads: Express and Worker return the same statuses and bodies", async () => {
  assertParity(await runUploadsScenario(express), await runUploadsScenario(worker));
});
