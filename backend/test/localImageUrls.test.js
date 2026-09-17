import { after, test } from "node:test";
import { runLocalImageUrlsScenario } from "./scenarios/localImageUrls.js";
import { expressOpsClient } from "./scenarios/opsKit.js";

const client = await expressOpsClient();
after(() => client.close());

test("Express: image URL fields accept http only on localhost", async () => {
  await runLocalImageUrlsScenario(client);
});
