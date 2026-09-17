import { after, test } from "node:test";
import { UPLOADS_ENV, runUploadsScenario } from "../../test/scenarios/uploads.js";
import { workerOpsClient } from "../../test/scenarios/opsKit.js";
import { R2Stub } from "./helpers/r2.js";

const client = await workerOpsClient({ ...UPLOADS_ENV, IMAGES: new R2Stub() });
after(() => client.close());

test("Worker: image uploads (Uploads v1)", async () => {
  await runUploadsScenario(client);
});
