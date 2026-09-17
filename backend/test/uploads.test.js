import { after, test } from "node:test";
import { UPLOADS_ENV, runUploadsScenario } from "./scenarios/uploads.js";
import { expressOpsClient } from "./scenarios/opsKit.js";

const client = await expressOpsClient(UPLOADS_ENV);
after(() => client.close());

test("Express: image uploads (Uploads v1)", async () => {
  await runUploadsScenario(client);
});
