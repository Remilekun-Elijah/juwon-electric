import { after, test } from "node:test";
import { runLandingScenario } from "./scenarios/landing.js";
import { expressOpsClient } from "./scenarios/opsKit.js";

const client = await expressOpsClient();
after(() => client.close());

test("Express: Landing v1 content, portfolio case studies and website settings", async () => {
  await runLandingScenario(client);
});
