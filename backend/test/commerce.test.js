import { after, test } from "node:test";
import { runCommerceScenario } from "./scenarios/commerce.js";
import { expressOpsClient } from "./scenarios/opsKit.js";

const client = await expressOpsClient();
after(() => client.close());

test("Express: composed packages, order snapshots and in-store orders", async () => {
  await runCommerceScenario(client);
});
