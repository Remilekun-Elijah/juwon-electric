import { after, test } from "node:test";
import { runInventoryScenario } from "./scenarios/inventory.js";
import { expressOpsClient } from "./scenarios/opsKit.js";

const client = await expressOpsClient();
after(() => client.close());

test("Express: inventory adjustments, movements and low-stock alerts", async () => {
  await runInventoryScenario(client);
});
