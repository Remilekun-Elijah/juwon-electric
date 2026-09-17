import { after, test } from "node:test";
import { runSettingsNotificationsScenario } from "../../test/scenarios/settingsNotifications.js";
import { workerOpsClient } from "../../test/scenarios/opsKit.js";

const client = await workerOpsClient();
after(() => client.close());

test("Worker: settings and notifications", async () => {
  await runSettingsNotificationsScenario(client);
});
