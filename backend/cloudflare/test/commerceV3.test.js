import { after, test } from "node:test";
import { runCommerceV3Scenario } from "../../test/scenarios/commerceV3.js";
import { workerOpsClient } from "../../test/scenarios/opsKit.js";

const client = await workerOpsClient();
after(() => client.close());

test("Worker: crews, one job per order, walk-in sales, product orders and package categories", async () => {
  await runCommerceV3Scenario(client);
});
