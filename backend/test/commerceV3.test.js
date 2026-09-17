import { after, test } from "node:test";
import { runCommerceV3Scenario } from "./scenarios/commerceV3.js";
import { expressOpsClient } from "./scenarios/opsKit.js";

const client = await expressOpsClient();
after(() => client.close());

test("Express: crews, one job per order, walk-in sales, product orders and package categories", async () => {
  await runCommerceV3Scenario(client);
});
