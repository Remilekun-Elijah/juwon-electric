// Express <-> Worker parity for team members (docs/agents/TEAM_AND_MOTION_V1.md §1).
import { after, test } from "node:test";
import { runTeamScenario } from "../scenarios/team.js";
import { assertParity, expressOpsClient, workerOpsClient } from "../scenarios/opsKit.js";

const express = await expressOpsClient();
const worker = await workerOpsClient();
after(() => Promise.all([express.close(), worker.close()]));

test("team: Express and Worker return the same statuses and bodies", async () => {
  assertParity(await runTeamScenario(express), await runTeamScenario(worker));
});
