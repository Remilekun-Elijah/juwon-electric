import { after, test } from "node:test";
import { runOrdersScenario } from "./scenarios/orders.js";
import { expressOpsClient } from "./scenarios/opsKit.js";

const client = await expressOpsClient();
after(() => client.close());

test("Express: order fulfilment, payment, assignment and stock commitment", async () => {
  await runOrdersScenario(client);
});
