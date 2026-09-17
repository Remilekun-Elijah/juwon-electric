import { after, test } from "node:test";
import { runLandingScenario } from "../../test/scenarios/landing.js";
import { workerOpsClient } from "../../test/scenarios/opsKit.js";

const client = await workerOpsClient();
after(() => client.close());

test("Worker: Landing v1 content, portfolio case studies and website settings", async () => {
  await runLandingScenario(client);
});
