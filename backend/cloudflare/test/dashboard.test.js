import { after, test } from "node:test";
import { runDashboardScenario } from "../../test/scenarios/dashboard.js";
import { workerOpsClient } from "../../test/scenarios/opsKit.js";

const client = await workerOpsClient();
after(() => client.close());

test("Worker: dashboard KPIs", async () => {
  await runDashboardScenario(client);
});
