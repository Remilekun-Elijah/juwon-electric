import { after, test } from "node:test";
import { runSettingsNotificationsScenario } from "./scenarios/settingsNotifications.js";
import { expressOpsClient } from "./scenarios/opsKit.js";

const client = await expressOpsClient();
after(() => client.close());

test("Express: settings and notifications", async () => {
  await runSettingsNotificationsScenario(client);
});
