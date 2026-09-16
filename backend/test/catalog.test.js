import { after, test } from "node:test";
import { runCatalogScenario } from "./scenarios/catalog.js";
import { expressOpsClient } from "./scenarios/opsKit.js";

const client = await expressOpsClient();
after(() => client.close());

test("Express: categories, products and package items", async () => {
  await runCatalogScenario(client);
});
