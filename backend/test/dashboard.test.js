import { after, test } from "node:test";
import { runDashboardScenario } from "./scenarios/dashboard.js";
import { expressOpsClient } from "./scenarios/opsKit.js";

const client = await expressOpsClient();
after(() => client.close());

test("Express: dashboard KPIs", async () => {
  await runDashboardScenario(client);
});
