import { after, test } from "node:test";
import { runLocalImageUrlsScenario } from "../../test/scenarios/localImageUrls.js";
import { workerOpsClient } from "../../test/scenarios/opsKit.js";

const client = await workerOpsClient();
after(() => client.close());

test("Worker: image URL fields accept http only on localhost", async () => {
  await runLocalImageUrlsScenario(client);
});
