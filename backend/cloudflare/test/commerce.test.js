import { after, test } from "node:test";
import { runCommerceScenario } from "../../test/scenarios/commerce.js";
import { workerOpsClient } from "../../test/scenarios/opsKit.js";

const client = await workerOpsClient();
after(() => client.close());

test("Worker: composed packages, order snapshots and in-store orders", async () => {
  await runCommerceScenario(client);
});
