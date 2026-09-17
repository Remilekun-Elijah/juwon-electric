// Express <-> Worker parity for settings and notifications (API_CONTRACT_V3 §11).
import { after, test } from "node:test";
import { runSettingsNotificationsScenario } from "../scenarios/settingsNotifications.js";
import { assertParity, expressOpsClient, workerOpsClient } from "../scenarios/opsKit.js";

const express = await expressOpsClient();
const worker = await workerOpsClient();
after(() => Promise.all([express.close(), worker.close()]));

test("settings and notifications: Express and Worker return the same statuses and bodies", async () => {
  assertParity(await runSettingsNotificationsScenario(express), await runSettingsNotificationsScenario(worker));
});
